let sharedWorker: Worker | null = null;

export function getSharedScannerWorker(): Worker {
  if (typeof window === 'undefined') {
    throw new Error('Web Worker can only be instantiated in browser environment');
  }
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL('./scannerWorker.ts', import.meta.url), { type: 'module' });
  }
  return sharedWorker;
}

export function terminateSharedScannerWorker() {
  if (sharedWorker) {
    try {
      sharedWorker.terminate();
    } catch (err) {
      console.error('Failed to terminate shared scanner worker:', err);
    }
    sharedWorker = null;
  }
}

export function resetSharedScannerWorker() {
  sharedWorker = null;
}

if (typeof globalThis !== 'undefined') {
  (globalThis as any).terminateSharedScannerWorker = terminateSharedScannerWorker;
  (globalThis as any).resetSharedScannerWorker = resetSharedScannerWorker;
}
