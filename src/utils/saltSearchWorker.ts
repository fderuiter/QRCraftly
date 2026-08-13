import QRCode from 'qrcode';
import { ValidationEngine } from '../engine/ValidationEngine';
import { QRConfig, QRModules } from '../types';
import { isMazeSolvable, appendSaltToUrl } from './mazeHelpers';
import { performScannabilityCheck } from './scannabilityChecker';
import { drawQRInternal } from './qrRenderer';

let latestSequenceId = -1;

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function serializeModules(modules: QRModules): Uint8Array {
  const size = modules.size;
  const matrix = new Uint8Array(size * size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      matrix[r * size + c] = modules.get(r, c) ? 1 : 0;
    }
  }
  return matrix;
}

self.onmessage = async (e: MessageEvent<{
  config: QRConfig;
  sequenceId: number;
  entry?: { r: number; c: number };
  exit?: { r: number; c: number };
  timeoutMs?: number;
}>) => {
  const { config, sequenceId, entry, exit, timeoutMs = 2000 } = e.data;

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

    const startTime = Date.now();
    let salt = 0;
    let found = false;
    let resultConfig = { ...config };
    let resultModules: any = null;

    // Create a dummy QR to determine the version/size of the grid
    const dummyData = QRCode.create(config.value, {
      errorCorrectionLevel: config.errorCorrectionLevel,
    });
    const size = dummyData.modules.size;

    // Use top-right white separator and bottom-right white separator as default entry/exit
    const actualEntry = entry || { r: 0, c: size - 8 };
    const actualExit = exit || { r: size - 1, c: size - 8 };

    // Offscreen Canvas for virtual rendering
    const canvasSize = 256;
    let canvas: OffscreenCanvas | null = null;
    let ctx: OffscreenCanvasRenderingContext2D | null = null;
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        canvas = new OffscreenCanvas(canvasSize, canvasSize);
        ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
      } catch {
        // Fallback if OffscreenCanvas creation fails
      }
    }

    while (Date.now() - startTime < timeoutMs) {
      // Yield to allow incoming/stale check cancellations
      if (salt % 10 === 0) {
        await yieldToEventLoop();
        if (sequenceId < latestSequenceId) {
          return;
        }
      }

      const saltedValue = appendSaltToUrl(config.value, salt);

      try {
        const qrData = QRCode.create(saltedValue, {
          errorCorrectionLevel: config.errorCorrectionLevel,
        });
        const currentSize = qrData.modules.size;
        const modules: QRModules = qrData.modules;

        // Stage 1: Fast BFS Solvability check
        const solvable = isMazeSolvable(modules, actualEntry, actualExit);
        if (solvable) {
          // Stage 2: Dual-stage scannability check
          if (canvas && ctx) {
            ctx.clearRect(0, 0, canvasSize, canvasSize);
            drawQRInternal(
              ctx as unknown as CanvasRenderingContext2D,
              modules,
              { ...config, value: saltedValue },
              null,
              null,
              canvasSize,
              currentSize,
              true
            );
            const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize);
            const scanResult = performScannabilityCheck(
              imageData,
              canvasSize,
              canvasSize,
              true // Fast/deterministic test mode inside the worker search
            );

            if (scanResult.success && scanResult.physicalReady) {
              found = true;
              resultConfig.value = saltedValue;
              resultModules = qrData.modules;
              break;
            }
          } else {
            // If OffscreenCanvas is not supported, we rely on BFS solvability as search criteria
            found = true;
            resultConfig.value = saltedValue;
            resultModules = qrData.modules;
            break;
          }
        }
      } catch {
        // Continue to next salt if qr creation fails
      }

      salt++;
    }

    // If no naturally solvable path was found within 2s, display the default layout
    if (!found) {
      const qrData = QRCode.create(config.value, {
        errorCorrectionLevel: config.errorCorrectionLevel,
      });
      resultModules = qrData.modules;
    }

    if (sequenceId === latestSequenceId) {
      self.postMessage({
        status: 'success',
        sequenceId,
        config: resultConfig,
        size: resultModules.size,
        matrix: serializeModules(resultModules),
        salt: found ? salt : null,
      });
    }
  } catch (error: any) {
    if (sequenceId === latestSequenceId) {
      self.postMessage({
        status: 'error',
        sequenceId,
        error: error?.message || 'SALT_SEARCH_FAILED',
      });
    }
  }
};
