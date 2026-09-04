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

import { DropletMetadata, FountainDroplet } from './contracts';

// Precomputed CRC32 lookup table for fast 32-bit checksumming
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

/**
 * Computes a 32-bit CRC checksum as an 8-character hex string.
 */
export function computeCrc32Hex(bytes: Uint8Array): string {
  let crc = 0xffffffff;
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

/**
 * Converts a Uint8Array buffer to a Base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to a Uint8Array buffer.
 */
export function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const FOUNTAIN_URI_PREFIX = 'ur:bytes/';

/**
 * Serializes a fountain droplet into a compact, BC-UR aligned URI string.
 * Format: ur:bytes/<seq>-<k>-<filesize>-<checksum>/<payload_base64>
 */
export function serializeDroplet(droplet: FountainDroplet): string {
  const meta = `${droplet.seq}-${droplet.k}-${droplet.fileSize}-${droplet.checksum}`;
  const payload = bytesToBase64(droplet.data);
  return `${FOUNTAIN_URI_PREFIX}${meta}/${payload}`;
}

/**
 * Checks if an incoming string signature matches a rateless fountain droplet envelope.
 */
export function isFountainDropletString(str: string): boolean {
  return str.startsWith(FOUNTAIN_URI_PREFIX);
}

/**
 * Parses a serialized fountain droplet string into its metadata and payload bytes.
 * Returns null if string format is invalid.
 */
export function parseDropletString(str: string): { meta: DropletMetadata; data: Uint8Array } | null {
  if (!isFountainDropletString(str)) return null;

  const content = str.slice(FOUNTAIN_URI_PREFIX.length);
  const slashIdx = content.indexOf('/');
  if (slashIdx === -1) return null;

  const header = content.slice(0, slashIdx);
  const payloadBase64 = content.slice(slashIdx + 1);

  const parts = header.split('-');
  if (parts.length < 4) return null;

  const seq = parseInt(parts[0], 10);
  const k = parseInt(parts[1], 10);
  const fileSize = parseInt(parts[2], 10);
  const checksum = parts[3];

  if (isNaN(seq) || isNaN(k) || isNaN(fileSize) || !checksum) {
    return null;
  }

  try {
    const data = base64ToBytes(payloadBase64);
    return {
      meta: { seq, k, fileSize, checksum },
      data,
    };
  } catch {
    return null;
  }
}

