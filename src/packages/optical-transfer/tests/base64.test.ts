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

import { describe, it, expect } from 'vitest';
import {
  bytesToBase64,
  base64ToBytes,
} from '../index';

const arrayBufferToBase64 = bytesToBase64;
const decodeBase64ToBytes = base64ToBytes;

describe('Centralized Base64 Utility', () => {
  describe('RFC 4648 Standard Vectors', () => {
    const encoder = new TextEncoder();

    const vectors: [string, string][] = [
      ['', ''],
      ['f', 'Zg=='],
      ['fo', 'Zm8='],
      ['foo', 'Zm9v'],
      ['foob', 'Zm9vYg=='],
      ['fooba', 'Zm9vYmE='],
      ['foobar', 'Zm9vYmFy'],
    ];

    it.each(vectors)('encodes "%s" to "%s"', (input, expectedBase64) => {
      const bytes = encoder.encode(input);
      expect(bytesToBase64(bytes)).toBe(expectedBase64);
    });

    it.each(vectors)('decodes "%s" back to "%s"', (expectedString, base64Input) => {
      const bytes = base64ToBytes(base64Input);
      const decoded = new TextDecoder().decode(bytes);
      expect(decoded).toBe(expectedString);
    });
  });

  describe('Binary Roundtrip Parity', () => {
    it('encodes and decodes full 0x00 - 0xFF byte range', () => {
      const bytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        bytes[i] = i;
      }

      const encoded = bytesToBase64(bytes);
      const decoded = base64ToBytes(encoded);

      expect(decoded).toEqual(bytes);
    });

    it('handles large multi-KB payloads efficiently', () => {
      const size = 100 * 1024; // 100 KB
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        bytes[i] = (i * 31 + 17) & 0xff;
      }

      const encoded = bytesToBase64(bytes);
      const decoded = base64ToBytes(encoded);

      expect(decoded).toEqual(bytes);
    });
  });

  describe('Zero-Allocation Buffer Reuse', () => {
    it('decodes into a pre-allocated target output buffer', () => {
      const originalText = 'Zero-allocation optical Base64 pipeline test!';
      const inputBytes = new TextEncoder().encode(originalText);
      const base64 = bytesToBase64(inputBytes);

      const targetBuffer = new Uint8Array(1024);
      const decodedSlice = base64ToBytes(base64, targetBuffer);

      // Sliced array should point to same underlying ArrayBuffer
      expect(decodedSlice.buffer).toBe(targetBuffer.buffer);
      expect(new TextDecoder().decode(decodedSlice)).toBe(originalText);
    });
  });

  describe('Alias Compatibility', () => {
    it('exports arrayBufferToBase64 and decodeBase64ToBytes aliases', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = arrayBufferToBase64(bytes.buffer);
      expect(encoded).toBe('SGVsbG8=');

      const decoded = decodeBase64ToBytes(encoded);
      expect(new TextDecoder().decode(decoded)).toBe('Hello');
    });
  });
});
