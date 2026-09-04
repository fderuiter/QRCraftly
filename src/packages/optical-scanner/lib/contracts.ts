/**
 * Type-guards, assertions, dimension calculators, and contracts
 * for the Optical Detection Engine package.
 */

export interface ScannerRequest {
  image: ImageBitmap;
  width: number;
  height: number;
  sequenceId: number;
  epochId?: number;
}

export interface ScannerResponse {
  status: 'pass' | 'fail';
  sequenceId: number;
  decodedData?: string | null;
  error?: string | null;
  buffer?: ArrayBuffer;
  epochId?: number;
}

export type ScanSource = File | Blob | ImageData | ImageBitmap | HTMLCanvasElement;

export interface ScanResult {
  status: 'pass' | 'fail';
  data: string | null;
  error?: string | null;
  durationMs: number;
}

export interface ScanOptions {
  signal?: AbortSignal;
  maxDimension?: number;
}

/**
 * Type-guard function for validating ScanOptions.
 */
export function isValidScanOptions(options: unknown): options is ScanOptions {
  if (options === undefined || options === null) return true;
  if (typeof options !== 'object') return false;
  const o = options as Record<string, unknown>;
  if (o.signal !== undefined && !(o.signal instanceof AbortSignal)) return false;
  if (
    o.maxDimension !== undefined &&
    (typeof o.maxDimension !== 'number' || !Number.isFinite(o.maxDimension) || o.maxDimension <= 0)
  ) {
    return false;
  }
  return true;
}

/**
 * Assertion function for ScanOptions.
 */
export function assertScanOptions(options: unknown): asserts options is ScanOptions {
  if (options === undefined || options === null) return;
  if (typeof options !== 'object') {
    throw new Error('ScanOptions must be an object');
  }
  const o = options as Record<string, unknown>;
  if (o.signal !== undefined && !(o.signal instanceof AbortSignal)) {
    throw new Error('ScanOptions signal must be an AbortSignal instance');
  }
  if (
    o.maxDimension !== undefined &&
    (typeof o.maxDimension !== 'number' || !Number.isFinite(o.maxDimension) || o.maxDimension <= 0)
  ) {
    throw new Error('ScanOptions maxDimension must be a positive finite number');
  }
}

export interface ScannerMetrics {
  latencyHistory: number[];
  frameDropCount: number;
  processingLatency: number;
  sessionType?: 'camera' | 'file';
}

export type ScannerStatus = 'idle' | 'checking' | 'pass' | 'fail';

/**
 * Calculates optimal downscaled dimensions preserving aspect ratio within a max constraint.
 */
export function getDownscaledDimensions(
  width: number,
  height: number,
  maxDimension = 1280
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }

  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const aspectRatio = width / height;
  if (width > height) {
    const dWidth = maxDimension;
    const dHeight = Math.round(maxDimension / aspectRatio);
    return { width: dWidth, height: dHeight };
  } else {
    const dHeight = maxDimension;
    const dWidth = Math.round(maxDimension * aspectRatio);
    return { width: dWidth, height: dHeight };
  }
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
  if (d.epochId !== undefined && (typeof d.epochId !== 'number' || !Number.isFinite(d.epochId))) return false;
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
  if (d.epochId !== undefined && (typeof d.epochId !== 'number' || !Number.isFinite(d.epochId))) {
    throw new Error('Scanner request epochId must be a valid number');
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
  if (d.epochId !== undefined && (typeof d.epochId !== 'number' || !Number.isFinite(d.epochId))) return false;
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
  if (d.buffer !== undefined && d.buffer !== null && !(d.buffer instanceof ArrayBuffer)) {
    throw new Error('Scanner response buffer must be an ArrayBuffer');
  }
  if (d.epochId !== undefined && (typeof d.epochId !== 'number' || !Number.isFinite(d.epochId))) {
    throw new Error('Scanner response epochId must be a valid number');
  }
}

