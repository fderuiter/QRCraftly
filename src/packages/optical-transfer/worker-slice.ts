/* eslint-disable security/detect-object-injection */
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

import QRCode from 'qrcode';
import { FountainEncoder } from './lib/fountain/encoder';

let file: Blob | null = null;
let chunkSize = 180;
let totalFrames = 0; // total including handshake
let totalDataFrames = 0; // only data frames
let nextIndexToGenerate = 0;
let lastAckedIndex = -1;
let errorCorrectionLevel = 'Q';
let currentSessionId = 0;
let activeGeneratingSessionId = 0;
let fileSHA256 = '';
let lookaheadLimit = 3;
let isFountainMode = false;
let fountainEncoder: FountainEncoder | null = null;

// Keyed by the Blob/File instance so a cached hash can never be reused for different content.
const hashCache = new WeakMap<Blob, string>();

/**
 * Converts an ArrayBuffer to a standard Base64 string in a worker-compatible way.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Computes the SHA-256 hash of a Blob off-thread.
 */
async function computeSHA256(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(arrayBuffer));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Slices a chunk from the file and generates a QR code matrix for it.
 */
async function generateFrame(index: number, sessionId: number) {
  if (sessionId !== currentSessionId || !file) return;

  try {
    let textPayload = '';

    if (isFountainMode && fountainEncoder) {
      textPayload = fountainEncoder.nextDropletString();
    } else if (index === 0) {
      const fileName = (file as any).name || 'file';
      const fileSize = file.size;
      const mimeType = file.type || 'application/octet-stream';
      textPayload = `H|${fileName}|${fileSize}|${mimeType}|${fileSHA256}`;
    } else {
      const dataIndex = index - 1;
      const start = dataIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const sliceBlob = file.slice(start, end);
      const arrayBuffer = await sliceBlob.arrayBuffer();

      if (sessionId !== currentSessionId) return;

      const base64Data = arrayBufferToBase64(arrayBuffer);
      textPayload = `F|${dataIndex}|${totalDataFrames}|${base64Data}`;
    }

    if (sessionId !== currentSessionId) return;

    // Generate QR matrix asynchronously
    const qr = QRCode.create(textPayload, { errorCorrectionLevel: errorCorrectionLevel as any });
    const { size, data } = qr.modules;

    if (sessionId !== currentSessionId) return;

    const transferableData = new Uint8Array(data);
    const buffer = transferableData.buffer;

    (self as any).postMessage(
      {
        type: 'FRAME',
        index,
        total: totalFrames,
        size,
        data: transferableData,
      },
      [buffer]
    );
  } catch (err: any) {
    if (sessionId !== currentSessionId) return;
    (self as any).postMessage({
      type: 'ERROR',
      message: `Failed to generate frame ${index}: ${err?.message || err}`,
    });
  }
}

/**
 * Evaluates lookahead and processes sequential frames up to lastAckedIndex + lookaheadLimit.
 */
async function processPipeline(sessionId: number) {
  if (sessionId !== currentSessionId || !file) return;
  if (activeGeneratingSessionId === sessionId) return;

  activeGeneratingSessionId = sessionId;

  try {
    while (
      sessionId === currentSessionId &&
      nextIndexToGenerate < totalFrames &&
      nextIndexToGenerate <= lastAckedIndex + lookaheadLimit
    ) {
      const currentIndex = nextIndexToGenerate;
      nextIndexToGenerate++;
      await generateFrame(currentIndex, sessionId);
    }
  } finally {
    if (activeGeneratingSessionId === sessionId) {
      activeGeneratingSessionId = 0;
    }
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data || {};

  switch (type) {
    case 'START': {
      currentSessionId++;
      const sessionId = currentSessionId;

      file = payload?.file;
      isFountainMode = !!payload?.fountainMode;
      const requestedChunkSize = payload?.chunkSize || 180;
      chunkSize = Math.min(requestedChunkSize < 256 ? requestedChunkSize : 180, 240);
      const reqEcc = payload?.errorCorrectionLevel;
      errorCorrectionLevel = reqEcc === 'H' || reqEcc === 'Q' ? reqEcc : 'Q';

      const fps = payload?.fps || 15;
      lookaheadLimit = Math.min(16, Math.max(3, Math.ceil(fps * 0.2)));

      if (!file) {
        if (sessionId === currentSessionId) {
          (self as any).postMessage({ type: 'ERROR', message: 'No file provided' });
        }
        return;
      }

      if (hashCache.has(file)) {
        fileSHA256 = hashCache.get(file)!;
      } else {
        try {
          fileSHA256 = await computeSHA256(file);
          if (sessionId !== currentSessionId) return;
          hashCache.set(file, fileSHA256);
        } catch (err: any) {
          if (sessionId !== currentSessionId) return;
          (self as any).postMessage({ type: 'ERROR', message: `Hashing failed: ${err?.message || err}` });
          return;
        }
      }

      if (sessionId !== currentSessionId) return;

      if (isFountainMode) {
        const fileBuffer = await file.arrayBuffer();
        if (sessionId !== currentSessionId) return;
        fountainEncoder = new FountainEncoder(new Uint8Array(fileBuffer), { blockSize: chunkSize });
        totalDataFrames = fountainEncoder.k;
        totalFrames = fountainEncoder.k;
      } else {
        fountainEncoder = null;
        totalDataFrames = Math.ceil(file.size / chunkSize);
        totalFrames = totalDataFrames + 1; // 1 handshake frame + totalDataFrames
      }

      nextIndexToGenerate = 0;
      lastAckedIndex = -1;

      (self as any).postMessage({
        type: 'PROGRESS',
        index: 0,
        total: totalFrames,
        fileName: (file as any).name || 'file',
        fileSize: file.size,
      });

      // For transferSession callers
      (self as any).postMessage({
        type: 'INITIALIZED',
        totalFrames,
        chunkSize,
        sha256: fileSHA256,
      });

      await processPipeline(sessionId);
      break;
    }

    case 'ACK': {
      if (!file) break;
      const acked = payload?.index;
      if (typeof acked === 'number' && acked > lastAckedIndex && acked < nextIndexToGenerate) {
        lastAckedIndex = acked;

        (self as any).postMessage({
          type: 'PROGRESS',
          index: lastAckedIndex + 1,
          total: totalFrames,
        });

        if (lastAckedIndex + 1 >= totalFrames) {
          (self as any).postMessage({ type: 'COMPLETE' });
        } else {
          await processPipeline(currentSessionId);
        }
      }
      break;
    }

    case 'HEAL': {
      if (!file) break;
      if (payload && typeof payload.lastAckedIndex === 'number') {
        const boundedAck = Math.min(payload.lastAckedIndex, nextIndexToGenerate - 1);
        if (boundedAck >= -1) {
          lastAckedIndex = Math.max(lastAckedIndex, boundedAck);
        }
      }
      await processPipeline(currentSessionId);
      break;
    }

    case 'STOP': {
      currentSessionId++;
      file = null;
      fountainEncoder = null;
      nextIndexToGenerate = 0;
      lastAckedIndex = -1;
      totalFrames = 0;
      totalDataFrames = 0;
      fileSHA256 = '';
      activeGeneratingSessionId = 0;
      lookaheadLimit = 3;
      break;
    }

    default:
      break;
  }
};

