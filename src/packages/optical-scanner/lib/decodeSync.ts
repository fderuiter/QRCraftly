import jsQR from 'jsqr';

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

/**
 * Decodes one frame with jsQR in up to three passes: dark-on-light at full
 * resolution, dark-on-light at {@link RETRY_SCALE}, then both polarities at full
 * resolution. jsQR's sampling grid misses dense codes (QR version 8 and up) at
 * some module sizes that decode fine a little smaller, so the downscaled pass
 * rescues most of those frames for about a third of the cost of a full pass.
 * @param data RGBA pixels.
 * @param width Frame width.
 * @param height Frame height.
 * @returns The decoded text, or null.
 */
export function decodeRgbaFrame(data: Uint8ClampedArray, width: number, height: number): string | null {
  try {
    const direct = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
    if (direct) return direct.data;
    if (width >= MIN_RETRY_DIMENSION && height >= MIN_RETRY_DIMENSION) {
      const small = downscaleRgba(data, width, height, RETRY_SCALE);
      const retried = jsQR(small.data, small.width, small.height, { inversionAttempts: 'dontInvert' });
      if (retried) return retried.data;
    }
    return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Decodes raw RGBA pixel data on the calling thread (see {@link decodeRgbaFrame}).
 */
export function decodeImageDataSync(
  imageData: ImageData | { data: Uint8ClampedArray },
  width: number,
  height: number
): string | null {
  return decodeRgbaFrame(imageData.data, width, height);
}
