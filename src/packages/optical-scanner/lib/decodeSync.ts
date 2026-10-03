import jsQR, { type QRCode } from 'jsqr';
// Types only: `scripts/bench_scanner.ts` loads this file from older git refs, so it imports nothing
// but jsQR at runtime.
import type { DecodedCode, ScanCorners } from './contracts';

/** Scale of the retry pass for frames the full-resolution pass could not read. */
const RETRY_SCALE = 0.6;
/** Frames smaller than this on either side skip the downscaled retry. */
const MIN_RETRY_DIMENSION = 160;

/**
 * Box-filters RGBA pixels down to `scale` of their size.
 * @param data RGBA pixels.
 * @param width Source width.
 * @param height Source height.
 * @param scale Factor in (0, 1).
 * @returns The downscaled pixels and size.
 */
export function downscaleRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number
): { data: Uint8ClampedArray; width: number; height: number } {
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));
  const out = new Uint8ClampedArray(outW * outH * 4);
  const stepX = width / outW;
  const stepY = height / outH;
  for (let y = 0; y < outH; y++) {
    const y0 = Math.floor(y * stepY);
    const y1 = Math.max(y0 + 1, Math.min(height, Math.floor((y + 1) * stepY)));
    for (let x = 0; x < outW; x++) {
      const x0 = Math.floor(x * stepX);
      const x1 = Math.max(x0 + 1, Math.min(width, Math.floor((x + 1) * stepX)));
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * width + sx) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
      }
      const n = (y1 - y0) * (x1 - x0);
      const o = (y * outW + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { data: out, width: outW, height: outH };
}

/** Maps a point of a transformed image back to the frame it was cut from. */
interface Transform {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

const IDENTITY: Transform = { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 };

/** Converts a jsQR result into a {@link DecodedCode}, its corners mapped through `transform`. */
function toDecodedCode(code: QRCode, transform: Transform = IDENTITY): DecodedCode {
  const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = code.location;
  const map = ({ x, y }: { x: number; y: number }) => ({
    x: transform.offsetX + x * transform.scaleX,
    y: transform.offsetY + y * transform.scaleY,
  });
  const corners: ScanCorners = [map(topLeftCorner), map(topRightCorner), map(bottomRightCorner), map(bottomLeftCorner)];
  return { text: code.data, bytes: Uint8Array.from(code.binaryData), corners };
}

/**
 * Decodes one frame with jsQR in up to three passes: dark-on-light at full
 * resolution, dark-on-light at {@link RETRY_SCALE}, then both polarities at full
 * resolution. jsQR's sampling grid misses dense codes (QR version 8 and up) at
 * some module sizes that decode fine a little smaller, so the downscaled pass
 * rescues most of those frames for about a third of the cost of a full pass.
 * @param data RGBA pixels.
 * @param width Frame width.
 * @param height Frame height.
 * @returns The decoded code (text, bytes and corners in the frame's pixels), or null.
 */
export function decodeRgbaCode(data: Uint8ClampedArray, width: number, height: number): DecodedCode | null {
  try {
    const direct = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
    if (direct) return toDecodedCode(direct);
    if (width >= MIN_RETRY_DIMENSION && height >= MIN_RETRY_DIMENSION) {
      const small = downscaleRgba(data, width, height, RETRY_SCALE);
      const retried = jsQR(small.data, small.width, small.height, { inversionAttempts: 'dontInvert' });
      if (retried) {
        return toDecodedCode(retried, {
          offsetX: 0,
          offsetY: 0,
          scaleX: width / small.width,
          scaleY: height / small.height,
        });
      }
    }
    const both = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    return both ? toDecodedCode(both) : null;
  } catch {
    return null;
  }
}

/**
 * One camera-frame decode strategy. The camera loop sees a new frame every few tens of
 * milliseconds, so each frame gets exactly one jsQR pass and consecutive frames rotate
 * through the strategies (#1096):
 * - `centre`: the centre square of the frame (where the viewfinder reticle is) at native
 *   resolution, for small or distant codes;
 * - `frame`: the whole frame, downscaled to at most {@link FRAME_PASS_MAX_DIMENSION};
 * - `inverted`: the centre square again, looking for light-on-dark codes only.
 */
export type CameraDecodeStrategy = 'centre' | 'frame' | 'inverted';

/** The rotation: the centre crop every other frame, the whole frame and an inverted pass in between. */
const CAMERA_STRATEGIES: readonly CameraDecodeStrategy[] = ['centre', 'frame', 'centre', 'inverted'];
/** Longest edge of the whole-frame passes. */
const FRAME_PASS_MAX_DIMENSION = 800;
/**
 * Sensor-noise levels (median grey difference between neighbouring pixels) above which a pass
 * decodes a box-downscaled copy instead. jsQR's binarizer turns grain into thousands of finder
 * pattern candidates: on a 1280x720 frame with +/-14 grey levels of noise one pass takes seconds.
 * Averaging 2x2 (or 3x3) pixels cuts the noise enough to keep a pass in the tens of milliseconds.
 */
const NOISY_LEVEL = 6;
const VERY_NOISY_LEVEL = 11;

/**
 * Picks the strategy for a camera frame.
 * @param sequenceId The frame's sequence number within its scan session (1, 2, ...).
 * @returns The pass to run on that frame.
 */
export function cameraStrategyFor(sequenceId: number): CameraDecodeStrategy {
  const index = (((Math.floor(sequenceId) - 1) % CAMERA_STRATEGIES.length) + CAMERA_STRATEGIES.length) % CAMERA_STRATEGIES.length;
  return CAMERA_STRATEGIES[index];
}

/** Copies the centred square of an RGBA frame and says where it was cut from. */
function cropCentre(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { data: Uint8ClampedArray; width: number; height: number; left: number; top: number } {
  const side = Math.min(width, height);
  if (side === width && side === height) return { data, width, height, left: 0, top: 0 };
  const left = Math.floor((width - side) / 2);
  const top = Math.floor((height - side) / 2);
  const out = new Uint8ClampedArray(side * side * 4);
  for (let y = 0; y < side; y++) {
    const from = ((top + y) * width + left) * 4;
    out.set(data.subarray(from, from + side * 4), y * side * 4);
  }
  return { data: out, width: side, height: side, left, top };
}

/**
 * Estimates sensor noise as the median absolute green-channel difference between horizontal
 * neighbours on a sample of rows. Codes and edges are a small share of neighbour pairs, so the
 * median tracks the grain of flat areas.
 * @returns The noise level in grey levels (0 for a clean frame).
 */
export function estimateNoise(data: Uint8ClampedArray, width: number, height: number): number {
  const histogram = new Uint32Array(256);
  const rowStep = Math.max(1, Math.floor(height / 48));
  let count = 0;
  for (let y = rowStep >> 1; y < height; y += rowStep) {
    let i = y * width * 4 + 1;
    const end = i + (width - 1) * 4;
    for (; i < end; i += 8) {
      histogram[Math.abs(data[i] - data[i + 4])] += 1;
      count += 1;
    }
  }
  let seen = 0;
  for (let level = 0; level < 256; level++) {
    seen += histogram[level];
    if (seen * 2 >= count) return level;
  }
  return 0;
}

/**
 * Decodes one camera frame with a single jsQR pass (see {@link CameraDecodeStrategy}). Noisy frames
 * are box-downscaled first so a grainy low-light frame cannot stall the worker for seconds.
 * @param data RGBA pixels.
 * @param width Frame width.
 * @param height Frame height.
 * @param strategy The strategy for this frame, from {@link cameraStrategyFor}.
 * @returns The decoded code (corners in the frame's pixels), or null.
 */
export function decodeCameraCode(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strategy: CameraDecodeStrategy
): DecodedCode | null {
  try {
    const cut = strategy === 'frame' ? { data, width, height, left: 0, top: 0 } : cropCentre(data, width, height);
    let image = { data: cut.data, width: cut.width, height: cut.height };
    const longest = Math.max(image.width, image.height);
    if (strategy === 'frame' && longest > FRAME_PASS_MAX_DIMENSION) {
      image = downscaleRgba(image.data, image.width, image.height, FRAME_PASS_MAX_DIMENSION / longest);
    }
    const noise = estimateNoise(image.data, image.width, image.height);
    if (noise >= NOISY_LEVEL && Math.min(image.width, image.height) >= MIN_RETRY_DIMENSION) {
      image = downscaleRgba(image.data, image.width, image.height, noise >= VERY_NOISY_LEVEL ? 1 / 3 : 0.5);
    }
    if (strategy === 'inverted') {
      // jsQR 1.4's `onlyInvert` never builds the inverted image, so invert the pixels here.
      const inverted = image.data === data ? new Uint8ClampedArray(image.data) : image.data;
      for (let i = 0; i < inverted.length; i += 4) {
        inverted[i] = 255 - inverted[i];
        inverted[i + 1] = 255 - inverted[i + 1];
        inverted[i + 2] = 255 - inverted[i + 2];
      }
      image = { ...image, data: inverted };
    }
    const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
    if (!code) return null;
    return toDecodedCode(code, {
      offsetX: cut.left,
      offsetY: cut.top,
      scaleX: cut.width / image.width,
      scaleY: cut.height / image.height,
    });
  } catch {
    return null;
  }
}

/**
 * Text-only form of {@link decodeCameraCode}.
 * @returns The decoded text, or null.
 */
export function decodeCameraFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strategy: CameraDecodeStrategy
): string | null {
  return decodeCameraCode(data, width, height, strategy)?.text ?? null;
}

/**
 * Decodes raw RGBA pixel data on the calling thread (see {@link decodeRgbaCode}).
 */
export function decodeImageDataSync(
  imageData: ImageData | { data: Uint8ClampedArray },
  width: number,
  height: number
): DecodedCode | null {
  return decodeRgbaCode(imageData.data, width, height);
}
