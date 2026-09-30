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

import { HandshakeInfo } from '../contracts';

/**
 * Parses an incoming QR text payload into a sequential handshake or data frame.
 */
export function parseSequentialFrame(text: string): {
  type: 'HANDSHAKE' | 'DATA';
  handshake?: HandshakeInfo;
  chunk?: {
    index: number;
    total: number;
    base64: string;
  };
} | null {
  if (text.startsWith('H|')) {
    const parts = text.split('|');
    if (parts.length < 5) return null;
    return {
      type: 'HANDSHAKE',
      handshake: {
        fileName: parts[1] || 'file',
        fileSize: parseInt(parts[2], 10) || 0,
        mimeType: parts[3] || 'application/octet-stream',
        sha256: parts[4] || '',
      },
    };
  }

  if (text.startsWith('F|')) {
    const parts = text.split('|');
    if (parts.length < 4) return null;
    const index = parseInt(parts[1], 10);
    const total = parseInt(parts[2], 10);
    const base64 = parts[3];
    if (isNaN(index) || isNaN(total) || !base64) return null;

    return {
      type: 'DATA',
      chunk: { index, total, base64 },
    };
  }

  return null;
}

/**
 * Sequential reassembler for legacy handshake/chunk streams.
 */
export class SequentialReassembler {
  public handshake: HandshakeInfo | null = null;
  public totalChunks: number | null = null;
  public receivedIndices: Set<number> = new Set();
  public chunksMap: Map<number, Uint8Array> = new Map();
  public knownChunkSize: number | null = null;

  public initHandshake(handshake: HandshakeInfo): void {
    this.handshake = handshake;
  }

  public ingestChunk(index: number, total: number, data: Uint8Array): boolean {
    if (this.receivedIndices.has(index)) return false;

    this.totalChunks = total;
    this.receivedIndices.add(index);
    this.chunksMap.set(index, data);

    if (!this.knownChunkSize && index < total - 1) {
      this.knownChunkSize = data.length;
    }

    return true;
  }

  public get progress(): number {
    if (!this.totalChunks) return 0;
    return Math.round((this.receivedIndices.size / this.totalChunks) * 100);
  }

  public get isComplete(): boolean {
    return this.totalChunks !== null && this.receivedIndices.size >= this.totalChunks;
  }

  public assemble(): Uint8Array | null {
    if (!this.isComplete || !this.totalChunks) return null;

    let totalLength = 0;
    for (let i = 0; i < this.totalChunks; i++) {
      const chunk = this.chunksMap.get(i);
      if (!chunk) return null;
      totalLength += chunk.length;
    }

    const assembled = new Uint8Array(totalLength);
    let offset = 0;
    for (let i = 0; i < this.totalChunks; i++) {
      const chunk = this.chunksMap.get(i)!;
      assembled.set(chunk, offset);
      offset += chunk.length;
    }

    return assembled;
  }

  public reset(): void {
    this.handshake = null;
    this.totalChunks = null;
    this.receivedIndices.clear();
    this.chunksMap.clear();
    this.knownChunkSize = null;
  }
}

