import QRCode from 'qrcode';
import { ValidationEngine } from '../engine/ValidationEngine';
import { QRConfig } from '../types';

let latestSequenceId = -1;

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function findShortestPath(
  start: { r: number; c: number },
  end: { r: number; c: number },
  modules: { size: number; get: (r: number, c: number) => boolean },
  size: number
) {
  const isTraversable = (r: number, c: number) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true; // Top-Left eyeball
    if (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4) return true; // Bottom-Left eyeball
    return !modules.get(r, c);
  };

  const queue: { r: number; c: number; path: { r: number; c: number }[] }[] = [];
  queue.push({ ...start, path: [start] });
  const visited = new Set<string>();
  visited.add(`${start.r},${start.c}`);

  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (queue.length > 0) {
    const { r, c, path } = queue.shift()!;
    if (r === end.r && c === end.c) {
      return path;
    }

    for (const { dr, dc } of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (isTraversable(nr, nc) && !visited.has(key)) {
        visited.add(key);
        queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }] });
      }
    }
  }

  return null;
}

self.onmessage = async (e: MessageEvent<{ config: QRConfig; sequenceId: number }>) => {
  const { config, sequenceId } = e.data;

  // Track latest sequence ID globally in the worker
  if (typeof sequenceId === 'number' && sequenceId > latestSequenceId) {
    latestSequenceId = sequenceId;
  }

  // Yield to event loop to allow incoming messages to override this one if they are newer
  await yieldToEventLoop();

  // If a newer request has already overridden this one, discard immediately
  if (sequenceId < latestSequenceId) {
    return;
  }

  try {
    // 1. Validate the configuration profile
    const violations = ValidationEngine.validateConfig(config);
    if (violations.length > 0) {
      if (sequenceId === latestSequenceId) {
        self.postMessage({
          status: 'validationFailed',
          sequenceId,
          violations,
        });
      }
      return;
    }

    // 2. Perform QR calculations (Reed-Solomon & module layout)
    const errCorr = config.isMazeModeEnabled ? 'H' : config.errorCorrectionLevel;
    const data = QRCode.create(config.value, {
      errorCorrectionLevel: errCorr,
    });

    const size = data.modules.size;
    const matrix = new Uint8Array(size * size);

    // Yield cooperatively during the serialization of heavy iterations
    for (let r = 0; r < size; r++) {
      if (r % 10 === 0) {
        await yieldToEventLoop();
        // Check again after yielding if we were preempted by a newer request
        if (sequenceId < latestSequenceId) {
          return;
        }
      }
      for (let c = 0; c < size; c++) {
        matrix[r * size + c] = data.modules.get(r, c) ? 1 : 0;
      }
    }

    // Apply Maze Mode mutations
    if (config.isMazeModeEnabled) {
      // Carve pathways through outer finder pattern frames
      // Top-Left (0, 0)
      matrix[6 * size + 3] = 0;
      matrix[3 * size + 6] = 0;

      // Top-Right (0, size - 7)
      matrix[6 * size + (size - 4)] = 0;
      matrix[3 * size + (size - 7)] = 0;

      // Bottom-Left (size - 7, 0)
      matrix[(size - 7) * size + 3] = 0;
      matrix[(size - 4) * size + 6] = 0;

      // Wrap matrix in temporary modules getter to run pathfinder
      const tempModules = {
        size,
        get(r: number, c: number) {
          return matrix[r * size + c] === 1;
        }
      };

      const path = findShortestPath({ r: 3, c: 3 }, { r: size - 4, c: 3 }, tempModules, size);
      if (!path) {
        // Solvability fallback: carve a straight bridge down column 3 from row 4 to size - 5
        for (let r = 4; r <= size - 5; r++) {
          matrix[r * size + 3] = 0;
        }
      }
    }

    if (sequenceId === latestSequenceId) {
      self.postMessage({
        status: 'success',
        sequenceId,
        size,
        matrix,
      });
    }
  } catch (error: any) {
    if (sequenceId === latestSequenceId) {
      self.postMessage({
        status: 'error',
        sequenceId,
        error: error?.message || 'MATRIX_GENERATION_FAILED',
      });
    }
  }
};
