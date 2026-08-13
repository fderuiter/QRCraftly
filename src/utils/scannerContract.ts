/**
 * Type-guard and assertion functions for the isolated QR scanner worker boundaries.
 */

export interface ScannerRequest {
  image: ImageBitmap;
  width: number;
  height: number;
  sequenceId: number;
}

export interface ScannerResponse {
  status: 'pass' | 'fail';
  sequenceId: number;
  decodedData?: string | null;
  error?: string | null;
}

/**
 * Type-guard function for validating the Scanner Worker Request structure.
 */
export function isValidScannerRequest(data: unknown): data is ScannerRequest {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as any;
  if (typeof ImageBitmap === 'undefined' || !(d.image instanceof ImageBitmap)) return false;
  if (typeof d.width !== 'number' || !Number.isFinite(d.width) || d.width <= 0) return false;
  if (typeof d.height !== 'number' || !Number.isFinite(d.height) || d.height <= 0) return false;
  if (typeof d.sequenceId !== 'number' || !Number.isFinite(d.sequenceId)) return false;
  return true;
}

/**
 * Assertion function for Scanner Worker Request.
 */
export function assertScannerRequest(data: unknown): asserts data is ScannerRequest {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Scanner request must be a non-null object');
  }
  const d = data as any;
  if (typeof ImageBitmap === 'undefined' || !(d.image instanceof ImageBitmap)) {
    throw new Error('Scanner request must contain a valid ImageBitmap');
  }
  if (typeof d.width !== 'number' || !Number.isFinite(d.width) || d.width <= 0) {
    throw new Error('Scanner request width must be a positive number');
  }
  if (typeof d.height !== 'number' || !Number.isFinite(d.height) || d.height <= 0) {
    throw new Error('Scanner request height must be a positive number');
  }
  if (typeof d.sequenceId !== 'number' || !Number.isFinite(d.sequenceId)) {
    throw new Error('Scanner request sequenceId must be a valid number');
  }
}

/**
 * Type-guard function for validating the Scanner Worker Response structure.
 */
export function isValidScannerResponse(data: unknown): data is ScannerResponse {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as any;
  if (d.status !== 'pass' && d.status !== 'fail') return false;
  if (typeof d.sequenceId !== 'number' || !Number.isFinite(d.sequenceId)) return false;
  if (d.decodedData !== undefined && d.decodedData !== null && typeof d.decodedData !== 'string') return false;
  if (d.error !== undefined && d.error !== null && typeof d.error !== 'string') return false;
  return true;
}

/**
 * Assertion function for Scanner Worker Response.
 */
export function assertScannerResponse(data: unknown): asserts data is ScannerResponse {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Scanner response must be a non-null object');
  }
  const d = data as any;
  if (d.status !== 'pass' && d.status !== 'fail') {
    throw new Error('Scanner response status must be either "pass" or "fail"');
  }
  if (typeof d.sequenceId !== 'number' || !Number.isFinite(d.sequenceId)) {
    throw new Error('Scanner response sequenceId must be a valid number');
  }
  if (d.decodedData !== undefined && d.decodedData !== null && typeof d.decodedData !== 'string') {
    throw new Error('Scanner response decodedData must be a string or null');
  }
  if (d.error !== undefined && d.error !== null && typeof d.error !== 'string') {
    throw new Error('Scanner response error must be a string or null');
  }
}

/**
 * Proportional downscaling logic for high-density frames, capped at maxLimit (default 1280px).
 */
export function getDownscaledDimensions(width: number, height: number, maxLimit = 1280): { width: number; height: number } {
  const maxDim = Math.max(width, height);
  if (maxDim > maxLimit) {
    const scale = maxLimit / maxDim;
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  }
  return { width, height };
}

