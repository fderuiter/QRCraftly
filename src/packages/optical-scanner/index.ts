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
  type ScannerMetrics,
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
