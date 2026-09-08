/**
 * Optical Detection Engine — Root Entry Point
 * Encapsulates off-thread Web Worker barcode decoding and polymorphic source extraction
 * behind a clean, high-level entry-point seam.
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
  isValidScanOptions,
  assertScanOptions,
} from './lib/contracts';
