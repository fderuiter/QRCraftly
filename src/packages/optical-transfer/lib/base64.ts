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
 * Centralized Zero-Allocation Base64 Utility
 * Fast, worker-compatible RFC 4648 Base64 encoder and decoder.
 * Operates without DOM `window`, `atob`, `btoa`, or Node.js `Buffer` APIs.
 */

const ENCODE_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const ENCODE_CODES = new Uint16Array(64);
for (let i = 0; i < 64; i++) {
  ENCODE_CODES[i] = ENCODE_TABLE.charCodeAt(i);
}

const DECODE_TABLE = new Uint8Array(256);
DECODE_TABLE.fill(255);
for (let i = 0; i < ENCODE_TABLE.length; i++) {
  DECODE_TABLE[ENCODE_TABLE.charCodeAt(i)] = i;
}
// '=' character is treated as 0 value for padding calculations
DECODE_TABLE['='.charCodeAt(0)] = 0;

// Internal batch buffer size for chunked String.fromCharCode conversions
const BATCH_SIZE = 16384;
const BATCH_BUFFER = new Uint16Array(BATCH_SIZE);

/**
 * Converts a Uint8Array or ArrayBuffer into an RFC 4648 Base64 encoded string.
 * Uses batch chunking to avoid creating transient string character primitives per byte.
 *
 * @param input - Byte array or ArrayBuffer to encode
 * @returns RFC 4648 Base64 string with '=' padding
 */
export function bytesToBase64(input: Uint8Array | ArrayBuffer): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const len = bytes.length;
  if (len === 0) return '';

  let result = '';
  let batchIdx = 0;

  const extraBytes = len % 3;
  const mainLen = len - extraBytes;

  for (let i = 0; i < mainLen; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];

    BATCH_BUFFER[batchIdx++] = ENCODE_CODES[b1 >> 2];
    BATCH_BUFFER[batchIdx++] = ENCODE_CODES[((b1 & 0x03) << 4) | (b2 >> 4)];
    BATCH_BUFFER[batchIdx++] = ENCODE_CODES[((b2 & 0x0f) << 2) | (b3 >> 6)];
    BATCH_BUFFER[batchIdx++] = ENCODE_CODES[b3 & 0x3f];

    if (batchIdx >= BATCH_SIZE - 4) {
      result += String.fromCharCode.apply(null, BATCH_BUFFER.subarray(0, batchIdx) as unknown as number[]);
      batchIdx = 0;
    }
  }

  if (extraBytes === 1) {
    const b1 = bytes[mainLen];
    BATCH_BUFFER[batchIdx++] = ENCODE_CODES[b1 >> 2];
    BATCH_BUFFER[batchIdx++] = ENCODE_CODES[(b1 & 0x03) << 4];
    BATCH_BUFFER[batchIdx++] = 61; // '='
    BATCH_BUFFER[batchIdx++] = 61; // '='
  } else if (extraBytes === 2) {
    const b1 = bytes[mainLen];
    const b2 = bytes[mainLen + 1];
    BATCH_BUFFER[batchIdx++] = ENCODE_CODES[b1 >> 2];
    BATCH_BUFFER[batchIdx++] = ENCODE_CODES[((b1 & 0x03) << 4) | (b2 >> 4)];
    BATCH_BUFFER[batchIdx++] = ENCODE_CODES[(b2 & 0x0f) << 2];
    BATCH_BUFFER[batchIdx++] = 61; // '='
  }

  if (batchIdx > 0) {
    result += String.fromCharCode.apply(null, BATCH_BUFFER.subarray(0, batchIdx) as unknown as number[]);
  }

  return result;
}

/**
 * Decodes an RFC 4648 Base64 string into a Uint8Array byte buffer.
 * Supports zero-allocation operation when passed a pre-allocated outputBuffer.
 *
 * @param base64 - RFC 4648 Base64 encoded string
 * @param outputBuffer - Optional pre-allocated Uint8Array to write decoded bytes into
 * @returns Uint8Array slice containing decoded byte sequence
 */
export function base64ToBytes(base64: string, outputBuffer?: Uint8Array): Uint8Array {
  // Clean whitespace if present
  const cleanBase64 = base64.replace(/[\s\r\n]+/g, '');
  const len = cleanBase64.length;
  if (len === 0) {
    return outputBuffer ? outputBuffer.subarray(0, 0) : new Uint8Array(0);
  }

  let padding = 0;
  if (len >= 2 && cleanBase64.endsWith('==')) {
    padding = 2;
  } else if (len >= 1 && cleanBase64.endsWith('=')) {
    padding = 1;
  }

  const outputLength = Math.floor((len * 3) / 4) - padding;
  const out = outputBuffer && outputBuffer.length >= outputLength ? outputBuffer : new Uint8Array(outputLength);

  let outIdx = 0;
  for (let i = 0; i < len; i += 4) {
    const code1 = cleanBase64.charCodeAt(i);
    const code2 = cleanBase64.charCodeAt(i + 1);
    const code3 = i + 2 < len ? cleanBase64.charCodeAt(i + 2) : 61;
    const code4 = i + 3 < len ? cleanBase64.charCodeAt(i + 3) : 61;

    const c1 = DECODE_TABLE[code1 & 0xff];
    const c2 = DECODE_TABLE[code2 & 0xff];
    const c3 = DECODE_TABLE[code3 & 0xff];
    const c4 = DECODE_TABLE[code4 & 0xff];

    if (c1 === 255 || c2 === 255) {
      continue;
    }

    out[outIdx++] = (c1 << 2) | (c2 >> 4);

    if (code3 !== 61 && c3 !== 255) {
      if (outIdx < outputLength) {
        out[outIdx++] = ((c2 & 0x0f) << 4) | (c3 >> 2);
      }
    }

    if (code4 !== 61 && c4 !== 255) {
      if (outIdx < outputLength) {
        out[outIdx++] = ((c3 & 0x03) << 6) | c4;
      }
    }
  }

  return out.subarray(0, outIdx);
}
