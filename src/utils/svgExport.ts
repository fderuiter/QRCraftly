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
import { drawWithTemplate, SOCIAL_DIMENSIONS } from './templateRenderer';
import { SafeUrlPipeline, normalizeUrl } from './url';

/**
 * Converts an image URL to a base64 data-URL so it can be embedded inline in
 * the SVG, making the output file self-contained (no external HTTP requests).
 *
 * If the URL is already a data-URL it is returned as-is (if safe).
 * If conversion fails (e.g. CORS or network error) or the URL is dangerous,
 * it returns null so the image is safely omitted.
 */
async function toDataUrl(url: string): Promise<string | null> {
  if (!url) return null;

  const normalized = normalizeUrl(url).toLowerCase();

  if (normalized.startsWith('data:')) {
    if (normalized.startsWith('data:image/')) {
      return url;
    }
    return null;
  }

  if (SafeUrlPipeline.isDangerous(url)) {
    return null;
  }

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  } catch {
    // Omit the image if it fails to load
    return null;
  }
}

/**
 * Creates a mock HTMLImageElement-like object with an `src` property.
 * This is what SvgContext.drawImage() reads from.
 */
function makeImgProxy(src: string | null): HTMLImageElement | null {
  if (!src) return null;
  return { src } as unknown as HTMLImageElement;
}

/**
 * Generates a fully self-contained SVG string that visually matches the QR
 * code that would be rendered to a canvas with the same configuration.
 *
 * When a social format or template is configured the SVG uses the standard
 * high-resolution dimensions (e.g. 1080 × 1920 for Story/9:16) and routes
 * rendering through {@link drawWithTemplate} so the template background and
 * text are included.
 *
 * Logos (both center and border) are fetched and embedded as base64 data-URLs
 * so the resulting `.svg` file works without an internet connection.
 *
 * @param config  The QR code configuration.
 * @returns A promise that resolves to the SVG XML string.
 */
export async function generateQRSvg(config: QRConfig): Promise<string> {
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

  // Determine output dimensions from the social format (canonical resolution)
  const { width: svgWidth, height: svgHeight } = SOCIAL_DIMENSIONS[config.socialFormat];

  // Create SVG context and render
  const ctx = new SvgContext(svgWidth, svgHeight);

  try {
    drawWithTemplate(
      ctx as unknown as CanvasRenderingContext2D,
      modules,
      config,
      logoImg,
      borderLogoImg,
      svgWidth,
      svgHeight,
      moduleCount
    );
  } catch (err) {
    console.warn('SVG QR generation failed:', err);
    throw err;
  }

  return ctx.serialize();
}
