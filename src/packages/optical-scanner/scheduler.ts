/**
 * Optical Detection Engine — Scheduler & Harness Seam
 * Exposes scheduling, memory pooling, and worker lifecycle controls for integration harnesses
 * and backwards-compatibility shims without polluting the high-level scan() entry point.
 */

export {
  AdaptiveFrameScheduler,
  type SchedulerOptions,
} from './lib/scheduler';

export {
  DoubleBufferPool,
  sharedBufferPool,
} from './lib/bufferPool';

export {
  getScannerWorker,
  terminateScannerWorker,
  resetScannerWorker,
} from './lib/workerRunner';

