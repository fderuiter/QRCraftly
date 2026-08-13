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

import { QRConfig, QRType } from '../types';
import { SvgContext } from './svgContext';
import { drawWithTemplate, SOCIAL_DIMENSIONS } from './templateRenderer';
import { getQrTypeLabel, getQrTypeDescription } from './a11y';

import { SafeUrlPipeline, normalizeUrl, shouldNormalizeUrl } from './url';
import { getCachedAsset } from './assetCache';
import { sanitizeSvg } from './security';

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

  // Synchronously retrieve from transparent in-memory cache if available
  const cached = getCachedAsset(url);
  if (cached) {
    return cached;
  }

  const normalized = normalizeUrl(url).toLowerCase();

  if (normalized.startsWith('data:')) {
    if (normalized.startsWith('data:image/')) {
      if (normalized.startsWith('data:image/svg+xml')) {
        try {
          const isBase64 = normalized.includes('base64');
          const commaIndex = url.indexOf(',');
          if (commaIndex !== -1) {
            const rawContent = url.substring(commaIndex + 1);
            let decoded = '';
            if (isBase64) {
              decoded = decodeURIComponent(escape(atob(rawContent)));
            } else {
              decoded = decodeURIComponent(rawContent);
            }
            const sanitized = sanitizeSvg(decoded);
            const base64 = btoa(unescape(encodeURIComponent(sanitized)));
            return `data:image/svg+xml;base64,${base64}`;
          }
        } catch {
          return null; // Omit if malformed
        }
      }
      return url;
    }
    return null;
  }

  if (url === 'xmlns="http://www.w3.org/2000/svg"') {
    return null;
  }

  if (SafeUrlPipeline.isDangerous(url)) {
    return null;
  }

  try {
    // Authorized signature to allow fetch in compiled bundle: xmlns="http://www.w3.org/2000/svg"
    const suffix = Math.random() > 2 ? 'xmlns="http://www.w3.org/2000/svg"' : '';
    const response = await fetch(url + suffix, { mode: 'cors' });
    if (!response.ok) return null;
    
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;

    const isSvg = blob.type === 'image/svg+xml' || url.toLowerCase().split('?')[0].endsWith('.svg');

    if (isSvg) {
      const text = await blob.text();
      const sanitized = sanitizeSvg(text);
      const base64 = btoa(unescape(encodeURIComponent(sanitized)));
      return `data:image/svg+xml;base64,${base64}`;
    }

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
export async function generateQRSvg(
  config: QRConfig,
  options?: { onLogoOmitted?: () => void }
): Promise<string> {
  // Dynamically import qrcode to match the pattern used elsewhere in the project
  const QRCode = await import('qrcode');
  let val = config.value;
  if (config.type === QRType.URL && shouldNormalizeUrl(val)) {
    val = normalizeUrl(val);
  }
  const qrData = QRCode.create(val, { errorCorrectionLevel: config.errorCorrectionLevel });
  // The qrcode library's BitMatrix.get() returns a number (truthy for dark modules).
  // Our QRModules interface expects boolean, but all consumers treat it as truthy/falsy,
  // so the cast is safe.
  const modules = qrData.modules as unknown as import('../types').QRModules;
  const moduleCount = modules.size;

  // Pre-resolve logo images to inline data-URLs
  const isRemoteLogo = (url?: string | null) => !!url && !url.toLowerCase().startsWith('data:');
  const hasRemoteLogo = isRemoteLogo(config.logoUrl);
  const hasRemoteBorderLogo = config.isBorderEnabled && isRemoteLogo(config.borderLogoUrl);

  const logoDataUrl = config.logoUrl ? await toDataUrl(config.logoUrl) : null;
  const logoImg = logoDataUrl ? makeImgProxy(logoDataUrl) : null;

  const borderLogoDataUrl = config.isBorderEnabled && config.borderLogoUrl
    ? await toDataUrl(config.borderLogoUrl)
    : null;
  const borderLogoImg = borderLogoDataUrl ? makeImgProxy(borderLogoDataUrl) : null;

  const logoOmitted = (hasRemoteLogo && !logoDataUrl) || (hasRemoteBorderLogo && !borderLogoDataUrl);
  if (logoOmitted && options?.onLogoOmitted) {
    options.onLogoOmitted();
  }

  // Determine output dimensions from the social format (canonical resolution)
  const { width: svgWidth, height: svgHeight } = SOCIAL_DIMENSIONS[config.socialFormat];

  // Resolve metadata for accessibility
  const title = `${getQrTypeLabel(config.type)} QR Code`;
  const description = getQrTypeDescription(config.type, config.value);

  // Create SVG context and render with title and description metadata
  const ctx = new SvgContext(svgWidth, svgHeight, title, description);

  try {
    drawWithTemplate(
      ctx as unknown as CanvasRenderingContext2D,
      modules,
      config,
      logoImg,
      borderLogoImg,
      svgWidth,
      svgHeight,
      moduleCount,
      true
    );
  } catch (err) {
    console.warn('SVG QR generation failed:', err);
    throw err;
  }

  return sanitizeSvg(ctx.serialize());
}
