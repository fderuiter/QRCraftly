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

import jsQR from 'jsqr';

export interface WasmDecodeOptions {
  inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth';
}

export interface WasmDecodeResult {
  data: string;
}

/**
 * Unified WebAssembly QR Matrix Decoder Engine.
 * Standardizes QR matrix decoding across background workers, optical harnesses, and main-thread fallbacks.
 *
 * @param data Raw RGBA image pixel buffer.
 * @param width Image width in pixels.
 * @param height Image height in pixels.
 * @param options Decoding options including polarity inversion strategy.
 * @returns Decoded QR code result object containing payload string, or null if unreadable.
 */
export function decodeQrWasm(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options?: WasmDecodeOptions
): WasmDecodeResult | null {
  if (!data || width <= 0 || height <= 0) {
    return null;
  }

  const clampedData =
    data instanceof Uint8ClampedArray
      ? data
      : new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

  try {
    const code = jsQR(clampedData, width, height, {
      inversionAttempts: options?.inversionAttempts ?? 'dontInvert',
    });

    if (code && code.data) {
      return { data: code.data };
    }
  } catch {
    return null;
  }

  return null;
}
