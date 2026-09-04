/**
 * Optical Detection Engine — Root Entry Point
 * Encapsulates off-thread Web Worker barcode decoding, adaptive frame scheduling,
 * and polymorphic source extraction behind a clean entry-point seam.
 */

export { scanSource as scan } from './lib/sourceExtractor';

export {
  type ScanSource,
  type ScanResult,
  type ScanOptions,
  type ScannerMetrics,
  type ScannerStatus,
  type ScannerRequest,
  type ScannerResponse,
  getDownscaledDimensions,
  isValidScannerRequest,
  assertScannerRequest,
  isValidScannerResponse,
  assertScannerResponse,
} from './lib/contracts';

export {
  DoubleBufferPool,
  sharedBufferPool,
} from './lib/bufferPool';

export {
  AdaptiveFrameScheduler,
  type SchedulerOptions,
} from './lib/scheduler';

export {
  getScannerWorker,
  terminateScannerWorker,
  resetScannerWorker,
} from './lib/workerRunner';

