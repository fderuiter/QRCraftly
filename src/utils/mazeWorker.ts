import { generateMaze } from './qr-renderers/maze';
import {
  isMazeWorkerRequest,
  assertMazeWorkerRequest,
  isMazeWorkerResponse,
  assertMazeWorkerResponse,
  MazeWorkerResponse,
} from './mazeContract';
import type { QRModules } from '../types';

let latestSequenceId = -1;

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

self.onmessage = async (e: MessageEvent<unknown>) => {
  let sequenceId: number | undefined;
  try {
    const data = e.data;
    if (data && typeof data === 'object') {
      sequenceId = (data as any).sequenceId;
    }

    if (typeof sequenceId === 'number' && sequenceId > latestSequenceId) {
      latestSequenceId = sequenceId;
    }

    // Yield immediately to let any incoming messages override this request
    await yieldToEventLoop();

    if (sequenceId !== undefined && sequenceId < latestSequenceId) {
      return; // Abort obsolete computation immediately
    }

    // Strictly validate incoming message at runtime
    if (!isMazeWorkerRequest(data)) {
      assertMazeWorkerRequest(data);
    } else {
      assertMazeWorkerRequest(data);
    }

    const { size, matrix, config } = data;

    // Reconstruct QRModules interface for the generator
    const modules: QRModules = {
      size,
      get(r: number, c: number) {
        return matrix[r * size + c] === 1;
      },
    };

    if (sequenceId !== undefined && sequenceId < latestSequenceId) {
      return; // Check again before running heavy CPU task
    }

    // Compute maze and A* pathfinding
    const mazeData = generateMaze(modules, config, size);

    if (sequenceId !== undefined && sequenceId < latestSequenceId) {
      return; // Check again after running heavy CPU task
    }

    // Construct response
    const response: MazeWorkerResponse = {
      status: 'success',
      sequenceId: sequenceId ?? -1,
      mazeData,
    };

    // Strictly validate outgoing message
    if (!isMazeWorkerResponse(response)) {
      assertMazeWorkerResponse(response);
    } else {
      assertMazeWorkerResponse(response);
    }

    self.postMessage(response);
  } catch (error: any) {
    if (sequenceId !== undefined && sequenceId < latestSequenceId) {
      return; // Quietly ignore obsolete request errors
    }

    const response: MazeWorkerResponse = {
      status: 'error',
      sequenceId: sequenceId ?? -1,
      error: error?.message || 'MAZE_GENERATION_FAILED',
    };

    try {
      if (!isMazeWorkerResponse(response)) {
        assertMazeWorkerResponse(response);
      } else {
        assertMazeWorkerResponse(response);
      }
      self.postMessage(response);
    } catch {
      self.postMessage({
        status: 'error',
        sequenceId: sequenceId ?? -1,
        error: error?.message || 'MAZE_GENERATION_FAILED',
      });
    }
  }
};
