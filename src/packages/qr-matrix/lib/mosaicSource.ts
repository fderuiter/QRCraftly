/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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

import type { MosaicSource } from './mosaic';

/** Longest side, in pixels, a mosaic image is decoded at. Enough for a version 40 halftone. */
const MAX_SOURCE_SIDE = 512;
/** Decoded images kept in memory. Volatile only: nothing is persisted. */
const MAX_CACHED_SOURCES = 4;

const decoded = new Map<string, MosaicSource>();
const pending = new Map<string, Promise<MosaicSource | null>>();

/**
 * Returns the decoded pixels for a mosaic image that has already been loaded.
 * @param url - The image URL (normally a `data:` URL from an upload).
 * @returns The decoded image, or `undefined` if it is not loaded yet.
 */
export function getMosaicSource(url: string | null | undefined): MosaicSource | undefined {
  return url ? decoded.get(url) : undefined;
}

/**
 * Stores decoded pixels for a mosaic image, evicting the oldest entry when full.
 * @param url - The image URL.
 * @param source - The decoded image.
 */
export function storeMosaicSource(url: string, source: MosaicSource): void {
  decoded.delete(url);
  decoded.set(url, source);
  while (decoded.size > MAX_CACHED_SOURCES) {
    const oldest = decoded.keys().next().value;
    if (oldest === undefined) break;
    decoded.delete(oldest);
  }
}

/** Drops every decoded mosaic image. */
export function clearMosaicSourceCache(): void {
  decoded.clear();
  pending.clear();
}

/**
 * Decodes an image in the browser, scales it so its longest side is at most
 * {@link MAX_SOURCE_SIDE} pixels and caches the RGBA pixels for {@link getMosaicSource}.
 * Resolves `null` when the image cannot be decoded or no 2D canvas is available.
 * @param url - The image URL (normally a `data:` URL from an upload).
 * @returns The decoded image, or `null`.
 */
export function loadMosaicSource(url: string): Promise<MosaicSource | null> {
  const cached = decoded.get(url);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(url);
  if (inFlight) return inFlight;

  const promise = new Promise<MosaicSource | null>((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(null);
          return;
        }
        const scale = Math.min(1, MAX_SOURCE_SIDE / Math.max(w, h));
        const width = Math.max(1, Math.round(w * scale));
        const height = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx || typeof ctx.getImageData !== 'function') {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const source: MosaicSource = { width, height, data: imageData.data };
        storeMosaicSource(url, source);
        resolve(source);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  }).finally(() => {
    pending.delete(url);
  });

  pending.set(url, promise);
  return promise;
}
