let sharedWorker: Worker | null = null;

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
 * Resets the worker reference (used in unit test teardowns).
 */
export function resetScannerWorker(): void {
  sharedWorker = null;
}

// Global hook for test mock environments
if (typeof globalThis !== 'undefined') {
  (globalThis as any).terminateSharedScannerWorker = terminateScannerWorker;
  (globalThis as any).resetSharedScannerWorker = resetScannerWorker;
}

