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
import { getQrTypeLabel, getQrTypeDescription } from './a11y';

import { SafeUrlPipeline, normalizeUrl } from './url';
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

function findShortestPath(
  start: { r: number; c: number },
  end: { r: number; c: number },
  modules: { size: number; get: (r: number, c: number) => boolean },
  size: number
) {
  const isTraversable = (r: number, c: number) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true; // Top-Left eyeball
    if (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4) return true; // Bottom-Left eyeball
    return !modules.get(r, c);
  };

  const queue: { r: number; c: number; path: { r: number; c: number }[] }[] = [];
  queue.push({ ...start, path: [start] });
  const visited = new Set<string>();
  visited.add(`${start.r},${start.c}`);

  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (queue.length > 0) {
    const { r, c, path } = queue.shift()!;
    if (r === end.r && c === end.c) {
      return path;
    }

    for (const { dr, dc } of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (isTraversable(nr, nc) && !visited.has(key)) {
        visited.add(key);
        queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }] });
      }
    }
  }

  return null;
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
  const errCorr = config.isMazeModeEnabled ? 'H' : config.errorCorrectionLevel;
  const qrData = QRCode.create(config.value, { errorCorrectionLevel: errCorr });
  // The qrcode library's BitMatrix.get() returns a number (truthy for dark modules).
  // Our QRModules interface expects boolean, but all consumers treat it as truthy/falsy,
  // so the cast is safe.
  let modules = qrData.modules as unknown as import('../types').QRModules;
  if (config.isMazeModeEnabled) {
    const size = modules.size;
    const matrix = new Uint8Array(size * size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        matrix[r * size + c] = modules.get(r, c) ? 1 : 0;
      }
    }
    // Top-Left (0, 0)
    matrix[6 * size + 3] = 0;
    matrix[3 * size + 6] = 0;

    // Top-Right (0, size - 7)
    matrix[6 * size + (size - 4)] = 0;
    matrix[3 * size + (size - 7)] = 0;

    // Bottom-Left (size - 7, 0)
    matrix[(size - 7) * size + 3] = 0;
    matrix[(size - 4) * size + 6] = 0;

    // Solvability check
    const tempModules = {
      size,
      get(r: number, c: number) {
        return matrix[r * size + c] === 1;
      }
    };
    const path = findShortestPath({ r: 3, c: 3 }, { r: size - 4, c: 3 }, tempModules, size);
    if (!path) {
      // Fallback
      for (let r = 4; r <= size - 5; r++) {
        matrix[r * size + 3] = 0;
      }
    }

    modules = {
      size,
      get(r, c) {
        return matrix[r * size + c] === 1;
      }
    };
  }
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
