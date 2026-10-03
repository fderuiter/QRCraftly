import { ScanSource, ScanResult, ScanOptions, getDownscaledDimensions } from './contracts';
import { dispatchWorkerRequest } from './workerRunner';
import { decodeImageDataSync } from './decodeSync';
import { decodeImageAtSizes, FILE_SCAN_MESSAGE, type FileScanRequest } from './imageFile';

/** A large photo gets the multi-pass decoder at two sizes; allow a slow phone time for that. */
const FILE_SCAN_TIMEOUT_MS = 10_000;
/** File scans number their requests apart from camera frames, which share the worker. */
let fileSequenceId = 1_000_000;

const NO_CODE_IN_IMAGE = 'No QR code detected in this image. Try a clearer or higher-contrast QR code image.';
const NOT_AN_IMAGE = 'Only images can be scanned. Use a photo or screenshot of the QR code.';

/** A decoded image and how to release it. */
interface LoadedImage {
  image: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

/** Loads an image with FileReader and an image element (browsers without `createImageBitmap`). */
function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image file.'));
      img.src = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

/** Decodes the file into pixels on this thread, applying its EXIF orientation. */
async function loadImage(file: Blob): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      throw new Error('Failed to load image file.');
    }
  }
  const img = await loadImageElement(file);
  return { image: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, close: () => {} };
}

/** Main-thread fallback when the worker cannot decode the file (no OffscreenCanvas, hung, crashed). */
async function decodeImageFileHere(file: Blob): Promise<string | null> {
  if (typeof document === 'undefined') {
    throw new Error('File decoding requires DOM environment');
  }
  const loaded = await loadImage(file);
  try {
    return decodeImageAtSizes(loaded.image, loaded.width, loaded.height, (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas.getContext('2d', { willReadFrequently: true });
    });
  } finally {
    loaded.close();
  }
}

/** Whether a file can be an image. Files with no type (some pickers) are tried anyway. */
function mayBeImage(file: Blob): boolean {
  return file.type === '' || file.type.startsWith('image/');
}

/**
 * Decodes an image file in the scanner worker, or here when the worker cannot. Concurrent calls
 * are independent: a newer file does not fail because an older one is still being decoded.
 */
async function scanImageFile(file: Blob, signal?: AbortSignal): Promise<string | null> {
  fileSequenceId += 1;
  const request: FileScanRequest = { type: FILE_SCAN_MESSAGE, file, sequenceId: fileSequenceId };
  const result = await dispatchWorkerRequest(request, [], { signal, timeoutMs: FILE_SCAN_TIMEOUT_MS });
  if (result.decoded || signal?.aborted) return result.decoded;
  // No error: the worker read the image and found no code. Otherwise it could not decode it.
  if (!result.error) return null;
  return decodeImageFileHere(file);
}

/**
 * Extracts and decodes QR codes from any supported ScanSource.
 */
export async function scanSource(source: ScanSource, options: ScanOptions = {}): Promise<ScanResult> {
  const start = performance.now();
  const signal = options.signal;

  if (signal?.aborted) {
    return {
      status: 'fail',
      data: null,
      error: 'ABORTED',
      durationMs: 0,
    };
  }

  try {
    // 1. Direct ImageData
    if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
      const decoded = decodeImageDataSync(source, source.width, source.height);
      const durationMs = performance.now() - start;
      return {
        status: decoded ? 'pass' : 'fail',
        data: decoded,
        error: decoded ? null : 'NO_QR_DETECTED',
        durationMs,
      };
    }

    // 2. HTMLCanvasElement
    if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
      const ctx = source.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to acquire canvas 2D rendering context');
      }
      const imgData = ctx.getImageData(0, 0, source.width, source.height);
      const decoded = decodeImageDataSync(imgData, source.width, source.height);
      const durationMs = performance.now() - start;
      return {
        status: decoded ? 'pass' : 'fail',
        data: decoded,
        error: decoded ? null : 'NO_QR_DETECTED',
        durationMs,
      };
    }

    // 3. ImageBitmap
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
      const { width: dWidth, height: dHeight } = getDownscaledDimensions(
        source.width,
        source.height,
        options.maxDimension ?? 1280
      );
      let imgData: ImageData | null = null;
      if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(dWidth, dHeight);
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, 0, 0, dWidth, dHeight);
          imgData = ctx.getImageData(0, 0, dWidth, dHeight);
        }
      } else if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = dWidth;
        canvas.height = dHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, 0, 0, dWidth, dHeight);
          imgData = ctx.getImageData(0, 0, dWidth, dHeight);
        }
      }

      if (!imgData) {
        throw new Error('Failed to extract pixels from ImageBitmap');
      }

      const decoded = decodeImageDataSync(imgData, dWidth, dHeight);
      const durationMs = performance.now() - start;
      return {
        status: decoded ? 'pass' : 'fail',
        data: decoded,
        error: decoded ? null : 'NO_QR_DETECTED',
        durationMs,
      };
    }

    // 4. Image File or Blob
    if (typeof Blob !== 'undefined' && source instanceof Blob) {
      if (!mayBeImage(source)) {
        throw new Error(NOT_AN_IMAGE);
      }
      const decoded = await scanImageFile(source, signal);
      if (signal?.aborted) {
        return { status: 'fail', data: null, error: 'ABORTED', durationMs: performance.now() - start };
      }
      return {
        status: decoded ? 'pass' : 'fail',
        data: decoded,
        error: decoded ? null : NO_CODE_IN_IMAGE,
        durationMs: performance.now() - start,
      };
    }

    throw new Error('Unsupported scan source type');
  } catch (err) {
    const durationMs = performance.now() - start;
    return {
      status: 'fail',
      data: null,
      error: (err instanceof Error && err.message) || 'Scanning failed',
      durationMs,
    };
  }
}
