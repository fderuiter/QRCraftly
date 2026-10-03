/**
 * Optical Detection Engine — Root Entry Point
 * Encapsulates off-thread Web Worker barcode decoding, polymorphic source extraction and the
 * headless Camera Scanner Engine behind a clean, high-level entry-point seam.
 */

export { scanSource as scan } from './lib/sourceExtractor';

export {
  createCameraScannerEngine,
  type CameraScannerEngine,
  type CameraScannerEngineConfig,
  type CameraScannerEngineOptions,
  type CameraScannerEngineEvents,
  type CameraScannerEngineMetrics,
  type CameraFrameSource,
  type CameraFrameGrabber,
  type CameraFramePixels,
} from './lib/cameraEngine';

/** The camera-frame decoder: one bounded jsQR pass per frame, rotating strategies (#1096). */
export {
  decodeCameraFrame,
  cameraStrategyFor,
  estimateNoise,
  type CameraDecodeStrategy,
} from './lib/decodeSync';

/** Per-session frame staleness, as the shared scanner worker judges it (#1095). */
export { createStaleFrameGuard, type StaleFrameGuard } from './lib/frameGuard';

export { type ScannerClock } from './lib/clock';

export {
  type ScannerWorkerFactory,
  type ScannerWorkerHandle,
  type ScannerWorkerHandlers,
} from './lib/workerRunner';

export {
  type ScanSource,
  type ScanResult,
  type ScanOptions,
  type ScannerStatus,
  type ScannerRequest,
  type ScannerResponse,
  getDownscaledDimensions,
  isValidScannerRequest,
  assertScannerRequest,
  isValidScannerResponse,
  assertScannerResponse,
  isValidScanOptions,
  assertScanOptions,
} from './lib/contracts';
