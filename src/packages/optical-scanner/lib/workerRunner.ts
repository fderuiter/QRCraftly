import { isValidScannerResponse, type ScannerRequest } from './contracts';

let sharedWorker: Worker | null = null;
let consecutiveRestarts = 0;
const MAX_CONSECUTIVE_RESTARTS = 3;

/**
 * Retrieves or lazily instantiates the shared background Web Worker for optical scanning.
 */
export function getScannerWorker(): Worker {
  if (typeof window === 'undefined') {
    throw new Error('Web Worker can only be instantiated in browser environment');
  }
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
  }
  return sharedWorker;
}

function disposeSharedWorker(): void {
  if (sharedWorker) {
    try {
      sharedWorker.terminate();
    } catch (err) {
      console.error('Failed to terminate shared scanner worker:', err);
    }
    sharedWorker = null;
  }
}

/**
 * Terminates the shared scanner worker, releasing its memory, and clears the crash counter.
 * The next scan lazily provisions a fresh worker.
 */
export function terminateScannerWorker(): void {
  disposeSharedWorker();
  consecutiveRestarts = 0;
}

/**
 * Terminates the current worker and provisions a fresh worker instance.
 * Returns null if the maximum consecutive restart limit has been reached.
 */
function recreateScannerWorker(): Worker | null {
  consecutiveRestarts += 1;
  disposeSharedWorker();

  if (consecutiveRestarts > MAX_CONSECUTIVE_RESTARTS) {
    console.error(
      `Optical scanner worker exceeded max consecutive restarts (${consecutiveRestarts} > ${MAX_CONSECUTIVE_RESTARTS}). Halting auto-restart.`
    );
    return null;
  }

  console.warn(
    `Watchdog: Recreating optical scanner worker (Attempt ${consecutiveRestarts} of ${MAX_CONSECUTIVE_RESTARTS}).`
  );

  try {
    return getScannerWorker();
  } catch (err) {
    console.error('Failed to provision new scanner worker:', err);
    return null;
  }
}

/**
 * Resets the consecutive crash counter upon a confirmed healthy worker decode cycle.
 */
function markWorkerHealthy(): void {
  consecutiveRestarts = 0;
}

export interface DispatchWorkerFrameOptions {
  imageData?: ImageData;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface DispatchWorkerFrameResult {
  decoded: string | null;
  buffer?: ArrayBuffer;
  error?: string | null;
}

/**
 * Dispatches an ArrayBuffer frame to the background worker with a bounded watchdog timeout,
 * automatic worker recreation upon hung execution, and clean listener detachment.
 */
export function dispatchWorkerFrame(
  buffer: ArrayBuffer,
  width: number,
  height: number,
  sequenceId: number,
  options: DispatchWorkerFrameOptions = {}
): Promise<DispatchWorkerFrameResult> {
  const { imageData, timeoutMs = 1500, signal } = options;

  return new Promise((resolve) => {
    let worker: Worker | null = null;
    try {
      worker = getScannerWorker();
    } catch {
      worker = null;
    }

    if (!worker || signal?.aborted) {
      resolve({ decoded: null, buffer, error: signal?.aborted ? 'ABORTED' : 'WORKER_UNAVAILABLE' });
      return;
    }

    let isDone = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      signal?.removeEventListener('abort', onAbort);
      if (worker) {
        try {
          if (typeof worker.removeEventListener === 'function') {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
          } else {
            // Test doubles without addEventListener: fall back to the handler properties.
            const legacyWorker: Pick<Worker, 'onmessage' | 'onerror'> = worker;
            legacyWorker.onmessage = null;
            legacyWorker.onerror = null;
          }
        } catch {
          // Ignore listener removal errors
        }
      }
    };

    const handleMessage = (e: MessageEvent) => {
      const payload = e.data;
      if (!isValidScannerResponse(payload)) return;
      if (payload.sequenceId !== sequenceId) return;

      if (!isDone) {
        isDone = true;
        cleanup();
        markWorkerHealthy();
        resolve({
          decoded: (payload.status === 'pass' ? payload.decodedData : null) ?? null,
          buffer: payload.buffer ?? buffer,
          error: payload.error ?? null,
        });
      }
    };

    const handleError = (err: unknown) => {
      console.warn('Worker error during frame dispatch:', err);
      if (!isDone) {
        isDone = true;
        cleanup();
        recreateScannerWorker();
        resolve({ decoded: null, buffer, error: 'WORKER_ERROR' });
      }
    };

    const onAbort = () => {
      if (!isDone) {
        isDone = true;
        cleanup();
        resolve({ decoded: null, buffer, error: 'ABORTED' });
      }
    };

    // Watchdog timeout to prevent unbounded hang
    timerId = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        cleanup();
        console.warn(`Watchdog: Off-thread frame ${sequenceId} timed out after ${timeoutMs}ms.`);
        recreateScannerWorker();
        resolve({ decoded: null, buffer, error: 'WATCHDOG_TIMEOUT' });
      }
    }, timeoutMs);

    signal?.addEventListener('abort', onAbort);

    try {
      if (typeof worker.addEventListener === 'function') {
        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);
      } else {
        // Test doubles without addEventListener: fall back to the handler properties.
        const legacyWorker: Pick<Worker, 'onmessage' | 'onerror'> = worker;
        legacyWorker.onmessage = handleMessage;
        legacyWorker.onerror = handleError;
      }

      const messagePayload: { buffer: ArrayBuffer; width: number; height: number; sequenceId: number; imageData?: ImageData } = {
        buffer,
        width,
        height,
        sequenceId,
      };
      if (imageData) {
        messagePayload.imageData = imageData;
      }

      worker.postMessage(messagePayload, [buffer]);
    } catch (postErr) {
      console.error('Failed to postMessage to scanner worker:', postErr);
      if (!isDone) {
        isDone = true;
        cleanup();
        resolve({ decoded: null, buffer, error: 'DISPATCH_ERROR' });
      }
    }
  });
}

/**
 * Callbacks the Camera Scanner Engine registers on the worker it drives.
 */
export interface ScannerWorkerHandlers {
  onMessage: (data: unknown) => void;
  onError: (reason: unknown) => void;
}

/**
 * The engine's private view of a scanner worker: post a camera frame, detach, or kill it.
 */
export interface ScannerWorkerHandle {
  /** Posts a camera frame request, transferring ownership of the listed objects. */
  postFrame: (request: ScannerRequest, transfer: Transferable[]) => void;
  /** Detaches the engine's listeners but leaves the worker running for other callers. */
  release: () => void;
  /** Detaches listeners and terminates the worker (used by watchdog recovery). */
  terminate: () => void;
}

/**
 * Creates a worker handle wired to the given handlers. Throws when no worker can be spawned
 * (for example under a strict CSP), which makes the engine fall back to main-thread decoding.
 */
export type ScannerWorkerFactory = (handlers: ScannerWorkerHandlers) => ScannerWorkerHandle;

/**
 * Default engine worker factory: attaches to the package's shared scanner worker so camera scanning
 * and file scanning reuse a single background thread.
 */
export const connectSharedScannerWorker: ScannerWorkerFactory = (handlers) => {
  const worker = getScannerWorker();
  const onMessage = (event: MessageEvent) => handlers.onMessage(event.data);
  const onError = (event: Event) => handlers.onError(event);
  worker.addEventListener('message', onMessage);
  worker.addEventListener('error', onError);
  worker.addEventListener('messageerror', onError);

  let attached = true;
  const release = () => {
    if (!attached) return;
    attached = false;
    try {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.removeEventListener('messageerror', onError);
    } catch (err) {
      console.error('Failed to detach scanner worker listeners:', err);
    }
  };

  return {
    postFrame: (request, transfer) => worker.postMessage(request, transfer),
    release,
    terminate: () => {
      release();
      if (sharedWorker === worker) {
        disposeSharedWorker();
      } else {
        worker.terminate();
      }
    },
  };
};
