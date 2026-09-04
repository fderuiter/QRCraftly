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

import { FountainDecoder } from './lib/fountain/decoder';
import { base64ToBytes as decodeBase64ToBytes } from './lib/base64';

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

export interface FountainWorkerMessage {
  type: 'FOUNTAIN_DROPLET' | 'DROPLET';
  droplet: string;
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
  | FountainWorkerMessage
  | LegacyReassemblyMessage
  | ClearWorkerMessage;

let allocatedBuffer: Uint8Array | null = null;
let totalChunksCount: number | null = null;
let targetFileSize: number | null = null;
let knownChunkSize: number | null = null;
let receivedIndices: Set<number> = new Set();
let handshakeMetadata: HandshakeMetadata | null = null;
let fountainDecoder: FountainDecoder | null = null;

function resetWorkerState(): void {
  allocatedBuffer = null;
  totalChunksCount = null;
  targetFileSize = null;
  knownChunkSize = null;
  receivedIndices = new Set();
  handshakeMetadata = null;
  if (fountainDecoder) {
    fountainDecoder.reset();
    fountainDecoder = null;
  }
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

    // --- Fountain Droplet Ingestion ---
    if (type === 'FOUNTAIN_DROPLET' || type === 'DROPLET') {
      const msg = data as FountainWorkerMessage;
      if (!fountainDecoder) {
        fountainDecoder = new FountainDecoder();
      }

      const madeProgress = fountainDecoder.ingestString(msg.droplet);
      if (madeProgress) {
        const total = fountainDecoder.k || 1;
        const current = fountainDecoder.resolvedBlockCount;
        const progress = fountainDecoder.progress;

        (self as any).postMessage({
          type: 'PROGRESS',
          progress,
          current,
          total,
          isFountain: true,
        });

        if (fountainDecoder.isComplete) {
          const finalBuffer = fountainDecoder.finalize();
          if (finalBuffer) {
            const bufCopy = new Uint8Array(finalBuffer);
            (self as any).postMessage(
              {
                type: 'COMPLETE',
                buffer: bufCopy.buffer,
                handshake: {
                  fileName: `received_file_${Date.now()}.bin`,
                  fileSize: finalBuffer.length,
                  mimeType: 'application/octet-stream',
                  sha256: '',
                },
                isFountain: true,
              },
              [bufCopy.buffer]
            );
            resetWorkerState();
          }
        }
      }
      return;
    }

    // --- Legacy Chunking Ingestion ---
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

        const currentEnd = offset + decodedBytes.length;
        if (handshakeMetadata?.fileSize && currentEnd > handshakeMetadata.fileSize) {
          handshakeMetadata.fileSize = currentEnd;
        }

        if (!handshakeMetadata?.fileSize && totalChunksCount && index === totalChunksCount - 1) {
          targetFileSize = currentEnd;
        }
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

      if (totalChunksCount && receivedIndices.size >= totalChunksCount) {
        if (!allocatedBuffer) {
          throw new Error('Reassembly failed: No buffer allocated.');
        }

        const exactLength = handshakeMetadata?.fileSize || targetFileSize || allocatedBuffer.length;
        const finalBuffer = allocatedBuffer.subarray(0, exactLength);
        const transferableData = new Uint8Array(finalBuffer);
        const bufferToTransfer = transferableData.buffer;

        (self as any).postMessage(
          {
            type: 'COMPLETE',
            buffer: bufferToTransfer,
            handshake: handshakeMetadata,
          },
          [bufferToTransfer]
        );

        resetWorkerState();
      }
      return;
    }

    if (type === 'START_REASSEMBLY') {
      const msg = data as LegacyReassemblyMessage;
      const { chunks, totalChunks } = msg;

      if (!chunks || chunks.length !== totalChunks) {
        (self as any).postMessage({
          type: 'ERROR',
          error: `Incomplete chunk set: received ${chunks?.length || 0} of ${totalChunks}`,
        });
        return;
      }

      chunks.sort((a, b) => a.index - b.index);

      const byteChunks: Uint8Array[] = [];
      let totalBytes = 0;

      for (let i = 0; i < chunks.length; i++) {
        const bytes = decodeBase64ToBytes(chunks[i].base64);
        byteChunks.push(bytes);
        totalBytes += bytes.length;

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        (self as any).postMessage({
          type: 'PROGRESS',
          progress,
          current: i + 1,
          total: totalChunks,
        });
      }

      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of byteChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      (self as any).postMessage(
        {
          type: 'COMPLETE',
          buffer: combined.buffer,
        },
        [combined.buffer]
      );

      resetWorkerState();
    }
  } catch (err: any) {
    (self as any).postMessage({
      type: 'ERROR',
      error: err?.message || 'Unknown reassembly error',
    });
  }
};

