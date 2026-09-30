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

import QRCode, { type QRCodeErrorCorrectionLevel } from 'qrcode';
import { FountainEncoder } from './lib/fountain/encoder';
import { createFountainSession, sha256Hex } from './lib/fountain/session';
import type {
  FountainInitInfo,
  SliceStartPayload,
  SliceWorkerIncomingMessage,
  SliceWorkerOutgoingMessage,
} from './lib/contracts';

const DEFAULT_CHUNK_SIZE = 180;

let file: Blob | null = null;
let chunkSize = DEFAULT_CHUNK_SIZE;
let totalFrames = 0; // legacy: handshake + data frames; fountain: K
let totalDataFrames = 0;
let nextIndexToGenerate = 0;
let lastAckedIndex = -1;
let errorCorrectionLevel: QRCodeErrorCorrectionLevel = 'Q';
let currentSessionId = 0;
let activeGeneratingSessionId = 0;
let fileSHA256 = '';
let lookaheadLimit = 3;
let fountainEncoder: FountainEncoder | null = null;

// Keyed by the Blob/File instance so a cached hash can never be reused for different content.
const hashCache = new WeakMap<Blob, string>();

function post(message: SliceWorkerOutgoingMessage, transfer: Transferable[] = []): void {
  self.postMessage(message, { transfer });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function fileNameOf(blob: Blob): string {
  return blob instanceof File && blob.name ? blob.name : 'file';
}

/**
 * Converts bytes to standard Base64 in a worker-compatible way.
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Builds the text payload for a frame index: a BC-UR droplet in fountain mode,
 * or the legacy `H|`/`F|` carousel frames otherwise.
 */
async function buildPayload(index: number, sessionId: number, source: Blob): Promise<string | null> {
  if (fountainEncoder) {
    return fountainEncoder.dropletStringForIndex(index);
  }
  if (index === 0) {
    const mimeType = source.type || 'application/octet-stream';
    return `H|${fileNameOf(source)}|${source.size}|${mimeType}|${fileSHA256}`;
  }
  const dataIndex = index - 1;
  const start = dataIndex * chunkSize;
  const arrayBuffer = await source.slice(start, Math.min(start + chunkSize, source.size)).arrayBuffer();
  if (sessionId !== currentSessionId) return null;
  return `F|${dataIndex}|${totalDataFrames}|${bytesToBase64(new Uint8Array(arrayBuffer))}`;
}

/**
 * Generates the QR module matrix for one frame and posts it (zero-copy).
 */
async function generateFrame(index: number, sessionId: number): Promise<void> {
  const source = file;
  if (sessionId !== currentSessionId || !source) return;

  try {
    const textPayload = await buildPayload(index, sessionId, source);
    if (textPayload === null || sessionId !== currentSessionId) return;

    const qr = QRCode.create(textPayload, { errorCorrectionLevel });
    const { size, data } = qr.modules;
    if (sessionId !== currentSessionId) return;

    const transferableData = new Uint8Array(data);
    post({ type: 'FRAME', index, total: totalFrames, size, data: transferableData }, [transferableData.buffer]);
  } catch (err: unknown) {
    if (sessionId !== currentSessionId) return;
    post({ type: 'ERROR', message: `Failed to generate frame ${index}: ${errorMessage(err)}` });
  }
}

/**
 * Generates frames up to lastAckedIndex + lookaheadLimit. Fountain streams are
 * unbounded; legacy streams stop at totalFrames.
 */
async function processPipeline(sessionId: number): Promise<void> {
  if (sessionId !== currentSessionId || !file) return;
  if (activeGeneratingSessionId === sessionId) return;

  activeGeneratingSessionId = sessionId;
  try {
    while (
      sessionId === currentSessionId &&
      (fountainEncoder !== null || nextIndexToGenerate < totalFrames) &&
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

async function handleStart(payload: SliceStartPayload | undefined): Promise<void> {
  currentSessionId++;
  const sessionId = currentSessionId;

  const source = payload?.file ?? null;
  file = source;
  fountainEncoder = null;
  const isFountainMode = payload?.fountainMode === true;
  const requestedChunkSize = payload?.chunkSize || DEFAULT_CHUNK_SIZE;
  chunkSize = Math.min(requestedChunkSize < 256 ? requestedChunkSize : DEFAULT_CHUNK_SIZE, 240);
  const reqEcc = payload?.errorCorrectionLevel;
  errorCorrectionLevel = reqEcc === 'H' || reqEcc === 'Q' ? reqEcc : 'Q';

  const fps = payload?.fps || 15;
  lookaheadLimit = Math.min(16, Math.max(3, Math.ceil(fps * 0.2)));

  if (!source) {
    post({ type: 'ERROR', message: 'No file provided' });
    return;
  }

  let fileBytes: Uint8Array | null = null;
  const cachedHash = hashCache.get(source);
  if (cachedHash !== undefined) {
    fileSHA256 = cachedHash;
  } else {
    try {
      fileBytes = new Uint8Array(await source.arrayBuffer());
      if (sessionId !== currentSessionId) return;
      fileSHA256 = await sha256Hex(fileBytes);
      if (sessionId !== currentSessionId) return;
      hashCache.set(source, fileSHA256);
    } catch (err: unknown) {
      if (sessionId !== currentSessionId) return;
      post({ type: 'ERROR', message: `Hashing failed: ${errorMessage(err)}` });
      return;
    }
  }
  if (sessionId !== currentSessionId) return;

  let fountainInfo: FountainInitInfo | null = null;
  if (isFountainMode) {
    try {
      const bytes = fileBytes ?? new Uint8Array(await source.arrayBuffer());
      if (sessionId !== currentSessionId) return;
      const session = await createFountainSession(bytes, {
        fileName: fileNameOf(source),
        mimeType: source.type,
        errorCorrectionLevel,
        requestedSymbolSize: payload?.chunkSize,
        sha256: fileSHA256,
      });
      if (sessionId !== currentSessionId) return;
      fountainEncoder = session.encoder;
      chunkSize = session.symbolSize;
      totalDataFrames = session.encoder.k;
      totalFrames = session.encoder.k;
      fountainInfo = {
        k: session.encoder.k,
        symbolSize: session.symbolSize,
        compression: session.header.compression,
        messageLength: session.encoder.messageLength,
      };
    } catch (err: unknown) {
      if (sessionId !== currentSessionId) return;
      post({ type: 'ERROR', message: `Fountain encoding failed: ${errorMessage(err)}` });
      return;
    }
  } else {
    totalDataFrames = Math.ceil(source.size / chunkSize);
    totalFrames = totalDataFrames + 1; // 1 handshake frame + totalDataFrames
  }

  nextIndexToGenerate = 0;
  lastAckedIndex = -1;

  post({ type: 'PROGRESS', index: 0, total: totalFrames, fileName: fileNameOf(source), fileSize: source.size });
  post({ type: 'INITIALIZED', totalFrames, chunkSize, sha256: fileSHA256, fountain: fountainInfo });

  await processPipeline(sessionId);
}

async function handleAck(index: number | undefined): Promise<void> {
  if (!file) return;
  if (typeof index !== 'number' || index <= lastAckedIndex || index >= nextIndexToGenerate) return;
  lastAckedIndex = index;
  post({ type: 'PROGRESS', index: lastAckedIndex + 1, total: totalFrames });

  // A rateless stream never completes on the sender side; it runs until STOP.
  if (!fountainEncoder && lastAckedIndex + 1 >= totalFrames) {
    post({ type: 'COMPLETE' });
  } else {
    await processPipeline(currentSessionId);
  }
}

function handleStop(): void {
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
}

self.onmessage = async (e: MessageEvent<SliceWorkerIncomingMessage | null>) => {
  const message = e.data;
  if (!message) return;

  switch (message.type) {
    case 'START':
      await handleStart(message.payload);
      break;
    case 'ACK':
      await handleAck(message.payload?.index);
      break;
    case 'HEAL': {
      if (!file) break;
      const requested = message.payload?.lastAckedIndex;
      if (typeof requested === 'number') {
        const boundedAck = Math.min(requested, nextIndexToGenerate - 1);
        if (boundedAck >= -1) {
          lastAckedIndex = Math.max(lastAckedIndex, boundedAck);
        }
      }
      await processPipeline(currentSessionId);
      break;
    }
    case 'STOP':
      handleStop();
      break;
    default:
      break;
  }
};
