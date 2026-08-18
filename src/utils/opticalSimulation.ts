/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Calculates a dynamic blur radius scaled to 5% of the input image width.
 * @param width - The width of the image.
 * @returns The calculated blur radius (minimum of 1).
 */
export function calculateBlurRadius(width: number): number {
  return Math.max(1, Math.floor(width * 0.05));
}

/**
 * Applies a 1D Box Blur (two-pass horizontal and vertical) and noise injection to a pixel array.
 * Values are clamped between 0 and 255.
 * @param pixels - Raw pixel data (e.g. ImageData.data).
 * @param width - Image width.
 * @param height - Image height.
 * @param noiseLevel - Intensity of randomized noise.
 * @param dstBuffer - Optional reusable destination buffer. Mutated in place and returned if length equals pixels.length.
 * @param tempBuffer - Optional reusable scratch buffer for horizontal blur pass. Mutated in place if length equals pixels.length.
 *
 * Note: pixels, dstBuffer, and tempBuffer must be three distinct arrays. Aliasing any two of them corrupts the blur output.
 * Callers must not reuse dstBuffer while concurrently reading a previously returned result.
 * @returns A Uint8ClampedArray containing the modified pixel data.
 */
export function applyOpticalSimulationMath(
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  noiseLevel = 10,
  dstBuffer?: Uint8ClampedArray,
  tempBuffer?: Uint8ClampedArray
): Uint8ClampedArray {
  const src = pixels;
  const dst = dstBuffer && dstBuffer.length === src.length ? dstBuffer : new Uint8ClampedArray(src.length);
  const blurRadius = calculateBlurRadius(width);
  
  // Fast box blur (horizontal then vertical)
  const temp = tempBuffer && tempBuffer.length === src.length ? tempBuffer : new Uint8ClampedArray(src.length);
  
  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let k = -blurRadius; k <= blurRadius; k++) {
        const px = x + k;
        if (px >= 0 && px < width) {
          const idx = (y * width + px) * 4;
          r += src[idx];
          g += src[idx + 1];
          b += src[idx + 2];
          count++;
        }
      }
      const outIdx = (y * width + x) * 4;
      temp[outIdx] = r / count;
      temp[outIdx + 1] = g / count;
      temp[outIdx + 2] = b / count;
      temp[outIdx + 3] = src[outIdx + 3];
    }
  }
  
  // Vertical pass + Noise
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let k = -blurRadius; k <= blurRadius; k++) {
        const py = y + k;
        if (py >= 0 && py < height) {
          const idx = (py * width + x) * 4;
          r += temp[idx];
          g += temp[idx + 1];
          b += temp[idx + 2];
          count++;
        }
      }
      
      const outIdx = (y * width + x) * 4;
      const noise = (Math.random() - 0.5) * noiseLevel;
      
      dst[outIdx] = Math.min(255, Math.max(0, (r / count) + noise));
      dst[outIdx + 1] = Math.min(255, Math.max(0, (g / count) + noise));
      dst[outIdx + 2] = Math.min(255, Math.max(0, (b / count) + noise));
      dst[outIdx + 3] = src[outIdx + 3];
    }
  }
  
  return dst;
}
