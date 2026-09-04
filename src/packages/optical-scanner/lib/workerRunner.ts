import { isValidScannerResponse } from './contracts';

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

/**
 * Terminates the shared scanner worker and resets the singleton instance.
 */
export function terminateScannerWorker(): void {
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
 * Resets the worker reference and crash counters (used in unit test teardowns).
 */
export function resetScannerWorker(): void {
  sharedWorker = null;
  consecutiveRestarts = 0;
}

/**
 * Terminates the current worker and provisions a fresh worker instance.
 * Returns null if the maximum consecutive restart limit has been reached.
 */
function recreateScannerWorker(): Worker | null {
  consecutiveRestarts += 1;
  terminateScannerWorker();

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
    let timerId: any = null;

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
            (worker as any).onmessage = null;
            (worker as any).onerror = null;
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

    const handleError = (err: any) => {
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
        (worker as any).onmessage = handleMessage;
        (worker as any).onerror = handleError;
      }

      const messagePayload: any = {
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

// Global hooks for test mock environments
if (typeof globalThis !== 'undefined') {
  (globalThis as any).terminateSharedScannerWorker = terminateScannerWorker;
  (globalThis as any).resetSharedScannerWorker = resetScannerWorker;
}
