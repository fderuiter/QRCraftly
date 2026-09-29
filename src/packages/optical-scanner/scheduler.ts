/**
 * Optical Detection Engine — Scheduler Seam
 * Exposes the Adaptive Frame Scheduler, memory pooling, and shared file-scan worker teardown.
 * Worker spawning is private to the package; camera scanning goes through the Camera Scanner Engine.
 */

export {
  AdaptiveFrameScheduler,
  type SchedulerOptions,
} from './lib/scheduler';

export {
  DoubleBufferPool,
  sharedBufferPool,
} from './lib/bufferPool';

export { terminateScannerWorker } from './lib/workerRunner';
