/**
 * Re-export shim for backwards compatibility.
 * Core implementation lives in `@/packages/optical-scanner/scheduler`.
 */

export {
  terminateScannerWorker as terminateSharedScannerWorker,
  resetScannerWorker as resetSharedScannerWorker,
} from '@/packages/optical-scanner/scheduler';
