/**
 * Re-export shim for backwards compatibility.
 * Core implementation lives in `@/packages/optical-scanner`.
 */

export {
  isValidScannerRequest,
  assertScannerRequest,
  isValidScannerResponse,
  assertScannerResponse,
} from '@/packages/optical-scanner';
