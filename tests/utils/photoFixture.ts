/*
    QRCraftly
    Copyright (C) 2026 fderuiter

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
 * Phone-photo fixtures for the scanner's image upload (#1098): a large JPEG of a QR code,
 * rendered by the browser under test, with an optional EXIF orientation tag.
 */
import type { Page } from '@playwright/test';
import { codeScene } from './fakeCamera';

export interface PhotoOptions {
  /** Photo size (default 4000x3000, a 12 MP phone photo). */
  width?: number;
  height?: number;
  /** Pixels per module (default 24). */
  modulePx?: number;
}

/**
 * Renders a JPEG photo of a QR code in the page (the browser's own encoder).
 * @param page Any page of the app.
 * @param text The payload.
 * @param options Size and module size.
 * @returns The JPEG bytes.
 */
export async function renderPhoto(page: Page, text: string, options: PhotoOptions = {}): Promise<Buffer> {
  const matrix = codeScene(text).matrix;
  if (!matrix) throw new Error('No QR matrix for the photo');
  const base64 = await page.evaluate(
    async ({ matrix: { size, bits }, width, height, modulePx }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2D context');
      // A slightly uneven, off-white background, like paper under room light.
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#e8e4dc');
      gradient.addColorStop(1, '#cfcac0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      const side = (size + 8) * modulePx;
      const left = Math.round((width - side) / 2);
      const top = Math.round((height - side) / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(left, top, side, side);
      ctx.fillStyle = '#141414';
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (bits[y * size + x] !== '1') continue;
          ctx.fillRect(left + (x + 4) * modulePx, top + (y + 4) * modulePx, modulePx, modulePx);
        }
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('JPEG encoding failed');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    },
    {
      matrix,
      width: options.width ?? 4000,
      height: options.height ?? 3000,
      modulePx: options.modulePx ?? 24,
    }
  );
  return Buffer.from(base64, 'base64');
}

/**
 * Inserts an EXIF APP1 segment holding only an Orientation tag right after the JPEG's SOI marker.
 * @param jpeg A JPEG without EXIF data.
 * @param orientation EXIF orientation (1-8).
 * @returns The tagged JPEG.
 */
export function withExifOrientation(jpeg: Buffer, orientation: number): Buffer {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('Not a JPEG');
  // Big-endian TIFF header, one IFD entry: 0x0112 Orientation, SHORT, count 1, value.
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01,
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const length = payload.length + 2;
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, length >> 8, length & 0xff]), payload]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}
