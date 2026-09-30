import jsQR from 'jsqr';

/**
 * Executes a two-pass synchronous QR decode attempt (standard followed by inverted)
 * on raw RGBA pixel data using pure JavaScript jsQR.
 */
export function decodeImageDataSync(
  imageData: ImageData | { data: Uint8ClampedArray },
  width: number,
  height: number
): string | null {
  try {
    let code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
    if (!code) {
      code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
    }
    return code?.data ?? null;
  } catch {
    return null;
  }
}

