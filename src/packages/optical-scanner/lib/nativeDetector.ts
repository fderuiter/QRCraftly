/**
 * The platform's `BarcodeDetector`, first in the decoder chain (#1099). Chrome on Android, ChromeOS
 * and macOS, and Safari where enabled, read QR codes with the operating system's own detector,
 * which is faster than any decoder we ship and copes better with blur, glare and perspective.
 *
 * It is used only when `getSupportedFormats()` lists `qr_code`; the check runs once per page.
 */
import type { DecodedCode, ScanCorners } from './contracts';

/** What the scanner passes to the detector: a video element, a bitmap, a canvas or pixels. */
export type DetectorSource = ImageBitmapSource;

/** The parts of a `BarcodeDetector` result the scanner reads. */
interface DetectedBarcodeLike {
  rawValue: string;
  cornerPoints?: ReadonlyArray<{ x: number; y: number }>;
}

/** The scanner's view of a QR code detector. */
export interface NativeQrDetector {
  /** Finds QR codes in the source; resolves with the first one, or null. */
  detect(source: DetectorSource): Promise<DecodedCode | null>;
}

/** The `BarcodeDetector` constructor surface (not yet in TypeScript's DOM lib). */
interface BarcodeDetectorLike {
  detect(source: DetectorSource): Promise<ReadonlyArray<DetectedBarcodeLike>>;
}
interface BarcodeDetectorConstructorLike {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

function isDetectorConstructor(value: unknown): value is BarcodeDetectorConstructorLike {
  return typeof value === 'function' && typeof Reflect.get(value, 'getSupportedFormats') === 'function';
}

function toCorners(points: DetectedBarcodeLike['cornerPoints']): ScanCorners | null {
  if (!points || points.length !== 4) return null;
  const [a, b, c, d] = points.map(({ x, y }) => ({ x, y }));
  return [a, b, c, d];
}

/**
 * Wraps a `BarcodeDetector` constructor as a {@link NativeQrDetector} if it reads QR codes.
 * @param ctor The constructor (`globalThis.BarcodeDetector`, or a stub in tests).
 * @returns The detector, or null when the constructor is missing or does not list `qr_code`.
 */
export async function createNativeQrDetector(ctor: unknown): Promise<NativeQrDetector | null> {
  if (!isDetectorConstructor(ctor)) return null;
  try {
    const formats = await ctor.getSupportedFormats();
    if (!formats.includes('qr_code')) return null;
    const detector = new ctor({ formats: ['qr_code'] });
    return {
      async detect(source) {
        const found = await detector.detect(source);
        const first = found.find((barcode) => typeof barcode.rawValue === 'string');
        if (!first) return null;
        // The detector reports text only; the bytes behind it are not exposed.
        return { text: first.rawValue, bytes: null, corners: toCorners(first.cornerPoints) };
      },
    };
  } catch {
    return null;
  }
}

let pageDetector: Promise<NativeQrDetector | null> | null = null;

/** The page's native QR detector (checked once), or null when the browser has none for QR codes. */
export function getNativeQrDetector(): Promise<NativeQrDetector | null> {
  pageDetector ??= createNativeQrDetector(Reflect.get(globalThis, 'BarcodeDetector'));
  return pageDetector;
}
