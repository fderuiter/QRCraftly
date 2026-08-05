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
 * Parses image dimensions (width/height) from a local base64 data-URL or encoded URI.
 * Supports SVG, PNG, JPEG, and GIF formats.
 */
export function parseImageDimensions(src: string): { width: number; height: number } | null {
  if (!src || !src.startsWith('data:')) return null;

  try {
    const commaIndex = src.indexOf(',');
    if (commaIndex === -1) return null;

    const meta = src.substring(0, commaIndex);
    const data = src.substring(commaIndex + 1);

    const isBase64 = meta.includes('base64');
    
    let binaryString = '';
    if (isBase64) {
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        binaryString = window.atob(data);
      } else if (typeof Buffer !== 'undefined') {
        binaryString = Buffer.from(data, 'base64').toString('binary');
      }
    } else {
      binaryString = decodeURIComponent(data);
    }

    if (meta.includes('image/svg+xml')) {
      const widthAttr = binaryString.match(/width=["']([^"']+)["']/i);
      const heightAttr = binaryString.match(/height=["']([^"']+)["']/i);
      const viewBoxAttr = binaryString.match(/viewBox=["']([^"']+)["']/i);

      let width = widthAttr ? parseFloat(widthAttr[1]) : null;
      let height = heightAttr ? parseFloat(heightAttr[1]) : null;

      if ((width === null || height === null) && viewBoxAttr) {
        const parts = viewBoxAttr[1].trim().split(/\s+/);
        if (parts.length === 4) {
          width = width ?? parseFloat(parts[2]);
          height = height ?? parseFloat(parts[3]);
        }
      }

      if (width && height) {
        return { width, height };
      }
    } else if (meta.includes('image/png')) {
      if (binaryString.length >= 24) {
        const width = (binaryString.charCodeAt(16) << 24) |
                      (binaryString.charCodeAt(17) << 16) |
                      (binaryString.charCodeAt(18) << 8) |
                      binaryString.charCodeAt(19);
        const height = (binaryString.charCodeAt(20) << 24) |
                       (binaryString.charCodeAt(21) << 16) |
                       (binaryString.charCodeAt(22) << 8) |
                       binaryString.charCodeAt(23);
        if (width > 0 && height > 0 && width < 100000 && height < 100000) {
          return { width, height };
        }
      }
    } else if (meta.includes('image/jpeg') || meta.includes('image/jpg')) {
      let i = 0;
      if (binaryString.charCodeAt(i) === 0xFF && binaryString.charCodeAt(i + 1) === 0xD8) {
        i += 2;
        while (i < binaryString.length - 8) {
          if (binaryString.charCodeAt(i) === 0xFF) {
            const marker = binaryString.charCodeAt(i + 1);
            if (marker === 0xD9 || marker === 0xDA) {
              break;
            }
            const length = (binaryString.charCodeAt(i + 2) << 8) | binaryString.charCodeAt(i + 3);
            if (marker >= 0xC0 && marker <= 0xC3) {
              const h = (binaryString.charCodeAt(i + 5) << 8) | binaryString.charCodeAt(i + 6);
              const w = (binaryString.charCodeAt(i + 7) << 8) | binaryString.charCodeAt(i + 8);
              if (w > 0 && h > 0) {
                return { width: w, height: h };
              }
            }
            i += 2 + length;
          } else {
            i++;
          }
        }
      }
    } else if (meta.includes('image/gif')) {
      if (binaryString.length >= 10) {
        const width = binaryString.charCodeAt(6) | (binaryString.charCodeAt(7) << 8);
        const height = binaryString.charCodeAt(8) | (binaryString.charCodeAt(9) << 8);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
    }
  } catch (err) {
    console.warn('Failed to parse image dimensions from data URL:', err);
  }

  return null;
}

/**
 * Loads an image asynchronously into an offscreen instance to resolve its physical dimensions.
 * Uses a local parser for ultra-fast, robust, environment-independent resolution.
 */
export function loadImgWithDimensions(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const parsed = parseImageDimensions(src);

    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      const img = {
        src,
        width: parsed?.width ?? 100,
        height: parsed?.height ?? 100,
        naturalWidth: parsed?.width ?? 100,
        naturalHeight: parsed?.height ?? 100,
      } as unknown as HTMLImageElement;
      resolve(img);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      resolve(img);
    };

    img.onerror = (err) => {
      if (parsed) {
        const fallbackImg = {
          src,
          width: parsed.width,
          height: parsed.height,
          naturalWidth: parsed.width,
          naturalHeight: parsed.height,
        } as unknown as HTMLImageElement;
        resolve(fallbackImg);
      } else {
        reject(err);
      }
    };

    img.src = src;

    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      resolve(img);
    }
  });
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
  const qrData = QRCode.create(config.value, { errorCorrectionLevel: config.errorCorrectionLevel });
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
  let logoImg: HTMLImageElement | null = null;
  if (logoDataUrl) {
    try {
      logoImg = await loadImgWithDimensions(logoDataUrl);
    } catch (err) {
      console.warn('Failed to load logo image:', err);
    }
  }

  const borderLogoDataUrl = config.isBorderEnabled && config.borderLogoUrl
    ? await toDataUrl(config.borderLogoUrl)
    : null;
  let borderLogoImg: HTMLImageElement | null = null;
  if (borderLogoDataUrl) {
    try {
      borderLogoImg = await loadImgWithDimensions(borderLogoDataUrl);
    } catch (err) {
      console.warn('Failed to load border logo image:', err);
    }
  }

  const logoOmitted = (hasRemoteLogo && !logoImg) || (hasRemoteBorderLogo && !borderLogoImg);
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

  return ctx.serialize();
}
