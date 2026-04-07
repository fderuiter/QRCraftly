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

import { QRConfig } from '../types';
import { SvgContext } from './svgContext';
import { drawQRInternal } from './qrRenderer';

const SVG_SIZE = 1024;

/**
 * Converts an image URL to a base64 data-URL so it can be embedded inline in
 * the SVG, making the output file self-contained (no external HTTP requests).
 *
 * If the URL is already a data-URL it is returned as-is.
 * If conversion fails (e.g. CORS or network error), the original URL is returned
 * so the <image> element still references the asset, just not inline.
 */
async function toDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;

  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fall back to the original URL; the SVG may not be fully self-contained.
    return url;
  }
}

/**
 * Creates a mock HTMLImageElement-like object with an `src` property.
 * This is what SvgContext.drawImage() reads from.
 */
function makeImgProxy(src: string): HTMLImageElement {
  return { src } as unknown as HTMLImageElement;
}

/**
 * Generates a fully self-contained SVG string that visually matches the QR
 * code that would be rendered to a canvas with the same configuration.
 *
 * Logos (both center and border) are fetched and embedded as base64 data-URLs
 * so the resulting `.svg` file works without an internet connection.
 *
 * @param config  The QR code configuration.
 * @param size    The logical pixel size for the SVG viewport (default: 1024).
 * @returns A promise that resolves to the SVG XML string.
 */
export async function generateQRSvg(config: QRConfig, size: number = SVG_SIZE): Promise<string> {
  // Dynamically import qrcode to match the pattern used elsewhere in the project
  const QRCode = await import('qrcode');
  const qrData = QRCode.create(config.value, { errorCorrectionLevel: config.errorCorrectionLevel });
  // The qrcode library's BitMatrix.get() returns a number (truthy for dark modules).
  // Our QRModules interface expects boolean, but all consumers treat it as truthy/falsy,
  // so the cast is safe.
  const modules = qrData.modules as unknown as import('../types').QRModules;
  const moduleCount = modules.size;

  // Pre-resolve logo images to inline data-URLs
  const logoImg = config.logoUrl
    ? makeImgProxy(await toDataUrl(config.logoUrl))
    : null;

  const borderLogoImg = config.isBorderEnabled && config.borderLogoUrl
    ? makeImgProxy(await toDataUrl(config.borderLogoUrl))
    : null;

  // Create SVG context and render
  const ctx = new SvgContext(size, size);

  try {
    drawQRInternal(
      ctx as unknown as CanvasRenderingContext2D,
      modules,
      config,
      logoImg,
      borderLogoImg,
      size,
      moduleCount
    );
  } catch (err) {
    console.warn('SVG QR generation failed:', err);
  }

  return ctx.serialize();
}
