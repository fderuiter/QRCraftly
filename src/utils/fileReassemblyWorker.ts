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

export interface HandshakeMetadata {
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  sha256?: string;
}

export interface InitWorkerMessage extends HandshakeMetadata {
  type: 'INIT' | 'ALLOCATE';
  fileSize: number;
  totalChunks?: number;
  chunkSize?: number;
}

export interface ChunkWorkerMessage {
  type: 'CHUNK' | 'PROCESS_CHUNK';
  index: number;
  total?: number;
  totalChunks?: number;
  base64: string;
  chunkSize?: number;
}

export interface LegacyReassemblyMessage {
  type: 'START_REASSEMBLY';
  chunks: Array<{ index: number; base64: string }>;
  totalChunks: number;
}

export interface ClearWorkerMessage {
  type: 'CLEAR' | 'RESET';
}

export type FileReassemblyIncomingMessage =
  | InitWorkerMessage
  | ChunkWorkerMessage
  | LegacyReassemblyMessage
  | ClearWorkerMessage;

let allocatedBuffer: Uint8Array | null = null;
let totalChunksCount: number | null = null;
let targetFileSize: number | null = null;
let knownChunkSize: number | null = null;
let receivedIndices: Set<number> = new Set();
let handshakeMetadata: HandshakeMetadata | null = null;

function resetWorkerState(): void {
  allocatedBuffer = null;
  totalChunksCount = null;
  targetFileSize = null;
  knownChunkSize = null;
  receivedIndices = new Set();
  handshakeMetadata = null;
}

function decodeBase64ToBytes(base64Str: string): Uint8Array {
  const binaryString = atob(base64Str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let j = 0; j < len; j++) {
    bytes[j] = binaryString.charCodeAt(j);
  }
  return bytes;
}

self.onmessage = async (e: MessageEvent<FileReassemblyIncomingMessage>) => {
  const data = e.data;
  if (!data || typeof data !== 'object') return;

  const { type } = data;

  try {
    if (type === 'CLEAR' || type === 'RESET') {
      resetWorkerState();
      return;
    }

    if (type === 'INIT' || type === 'ALLOCATE') {
      resetWorkerState();
      const msg = data as InitWorkerMessage;
      if (typeof msg.fileSize === 'number' && msg.fileSize > 0) {
        targetFileSize = msg.fileSize;
        allocatedBuffer = new Uint8Array(msg.fileSize);
      }
      if (typeof msg.totalChunks === 'number' && msg.totalChunks > 0) {
        totalChunksCount = msg.totalChunks;
      }
      if (typeof msg.chunkSize === 'number' && msg.chunkSize > 0) {
        knownChunkSize = msg.chunkSize;
      }
      handshakeMetadata = {
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        mimeType: msg.mimeType,
        sha256: msg.sha256,
      };
      return;
    }

    if (type === 'CHUNK' || type === 'PROCESS_CHUNK') {
      const msg = data as ChunkWorkerMessage;
      const index = msg.index;
      const base64 = msg.base64;
      const tot = msg.totalChunks ?? msg.total;

      if (typeof tot === 'number' && tot > 0) {
        totalChunksCount = tot;
      }

      if (receivedIndices.has(index)) {
        // Duplicate chunk already processed in buffer
        return;
      }

      const decodedBytes = decodeBase64ToBytes(base64);

      if (typeof msg.chunkSize === 'number' && msg.chunkSize > 0) {
        knownChunkSize = msg.chunkSize;
      } else if (!knownChunkSize && totalChunksCount) {
        if (index < totalChunksCount - 1 || totalChunksCount === 1) {
          knownChunkSize = decodedBytes.length;
        }
      }

      // Pre-allocate buffer if not yet allocated
      if (!allocatedBuffer) {
        if (targetFileSize && targetFileSize > 0) {
          allocatedBuffer = new Uint8Array(targetFileSize);
        } else if (knownChunkSize && totalChunksCount) {
          if (index === totalChunksCount - 1) {
            targetFileSize = (totalChunksCount - 1) * knownChunkSize + decodedBytes.length;
          } else {
            targetFileSize = totalChunksCount * knownChunkSize;
          }
          allocatedBuffer = new Uint8Array(targetFileSize);
        } else if (totalChunksCount === 1) {
          targetFileSize = decodedBytes.length;
          allocatedBuffer = new Uint8Array(targetFileSize);
        }
      }

      // Calculate byte offset for this chunk index
      let offset = 0;
      if (knownChunkSize) {
        offset = index * knownChunkSize;
      } else if (totalChunksCount && index === totalChunksCount - 1 && targetFileSize) {
        offset = targetFileSize - decodedBytes.length;
      }

      if (allocatedBuffer) {
        if (allocatedBuffer.length < offset + decodedBytes.length) {
          const newLen = Math.max(allocatedBuffer.length, offset + decodedBytes.length);
          const expanded = new Uint8Array(newLen);
          expanded.set(allocatedBuffer, 0);
          allocatedBuffer = expanded;
          targetFileSize = newLen;
        }
        allocatedBuffer.set(decodedBytes, offset);
      }

      receivedIndices.add(index);

      const total = totalChunksCount || 1;
      const current = receivedIndices.size;
      const progress = Math.round((current / total) * 100);

      (self as any).postMessage({
        type: 'PROGRESS',
        progress,
        current,
        total,
        index,
      });

      if (totalChunksCount && receivedIndices.size === totalChunksCount && allocatedBuffer) {
        let finalBuffer = allocatedBuffer;
        if (targetFileSize && allocatedBuffer.length > targetFileSize) {
          finalBuffer = allocatedBuffer.subarray(0, targetFileSize);
        }

        const buffer = finalBuffer.buffer;
        const metadata = handshakeMetadata;

        resetWorkerState();

        (self as any).postMessage(
          {
            type: 'COMPLETE',
            buffer,
            handshake: metadata,
          },
          [buffer]
        );
      }
      return;
    }

    if (type === 'START_REASSEMBLY') {
      const msg = data as LegacyReassemblyMessage;
      const { chunks, totalChunks } = msg;

      if (!chunks || !Array.isArray(chunks)) {
        throw new Error('Invalid or missing chunks array.');
      }

      const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);

      if (sortedChunks.length !== totalChunks) {
        throw new Error(`Chunk count mismatch. Expected ${totalChunks}, got ${sortedChunks.length}`);
      }

      for (let i = 0; i < totalChunks; i++) {
        if (sortedChunks[i].index !== i) {
          throw new Error(`Missing chunk at index ${i}`);
        }
      }

      const decodedChunks: Uint8Array[] = [];
      let totalLength = 0;

      for (let i = 0; i < totalChunks; i++) {
        const bytes = decodeBase64ToBytes(sortedChunks[i].base64);
        decodedChunks.push(bytes);
        totalLength += bytes.length;

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        (self as any).postMessage({
          type: 'PROGRESS',
          progress,
          current: i + 1,
          total: totalChunks,
        });
      }

      const mergedArray = new Uint8Array(totalLength);
      let offset = 0;
      for (let i = 0; i < totalChunks; i++) {
        mergedArray.set(decodedChunks[i], offset);
        offset += decodedChunks[i].length;
      }

      const buffer = mergedArray.buffer;

      (self as any).postMessage(
        {
          type: 'COMPLETE',
          buffer,
        },
        [buffer]
      );
      return;
    }
  } catch (err: any) {
    (self as any).postMessage({
      type: 'ERROR',
      error: err?.message || 'Unknown reassembly error',
    });
  }
};
