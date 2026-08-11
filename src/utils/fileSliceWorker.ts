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

let file: Blob | null = null;
let chunkSize = 256;
let totalFrames = 0;
let nextIndexToGenerate = 0;
let lastAckedIndex = -1;
let errorCorrectionLevel = 'M';
let isGenerating = false;

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
 * Slices a chunk from the file and generates a QR code matrix for it.
 */
async function generateFrame(index: number) {
  if (!file) return;

  const start = index * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const sliceBlob = file.slice(start, end);
  
  try {
    const arrayBuffer = await sliceBlob.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);
    
    // Construct the standard frame format: F|<index>|<total>|<base64>
    const textPayload = `F|${index}|${totalFrames}|${base64Data}`;
    
    // Generate QR matrix asynchronously
    const qr = QRCode.create(textPayload, { errorCorrectionLevel: errorCorrectionLevel as any });
    const { size, data } = qr.modules; // data is a Uint8Array
    
    // Make a copy of the data buffer to transfer so we can safely postMessage
    const transferableData = new Uint8Array(data);
    const buffer = transferableData.buffer;

    (self as any).postMessage({
      type: 'FRAME',
      index,
      total: totalFrames,
      size,
      data: transferableData
    }, [buffer]);

  } catch (err: any) {
    (self as any).postMessage({
      type: 'ERROR',
      message: `Failed to generate frame ${index}: ${err?.message || err}`
    });
  }
}

/**
 * Evaluates lookahead and processes sequential frames up to lastAckedIndex + 3.
 */
async function processPipeline() {
  if (isGenerating || !file) return;
  isGenerating = true;

  try {
    // Generate frames as long as we don't exceed 3 frames ahead of the last ACK
    while (
      nextIndexToGenerate < totalFrames &&
      nextIndexToGenerate <= lastAckedIndex + 3
    ) {
      const currentIndex = nextIndexToGenerate;
      nextIndexToGenerate++;
      await generateFrame(currentIndex);
    }
  } finally {
    isGenerating = false;
  }
}

/**
 * Main Web Worker message router.
 */
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data || {};

  switch (type) {
    case 'START': {
      file = payload.file;
      chunkSize = payload.chunkSize || 256;
      errorCorrectionLevel = payload.errorCorrectionLevel || 'M';
      
      if (!file) {
        (self as any).postMessage({ type: 'ERROR', message: 'No file provided' });
        return;
      }

      totalFrames = Math.ceil(file.size / chunkSize);
      nextIndexToGenerate = 0;
      lastAckedIndex = -1;
      
      (self as any).postMessage({
        type: 'PROGRESS',
        index: 0,
        total: totalFrames,
        fileName: (file as any).name || 'file',
        fileSize: file.size
      });

      // Kick off generation
      await processPipeline();
      break;
    }

    case 'ACK': {
      const acked = payload.index;
      if (acked > lastAckedIndex) {
        lastAckedIndex = acked;
        
        // Report progress to UI
        (self as any).postMessage({
          type: 'PROGRESS',
          index: lastAckedIndex + 1,
          total: totalFrames
        });

        if (lastAckedIndex + 1 >= totalFrames) {
          (self as any).postMessage({ type: 'COMPLETE' });
        } else {
          // Trigger generation of more frames within our sliding window limit
          await processPipeline();
        }
      }
      break;
    }

    case 'STOP': {
      file = null;
      totalFrames = 0;
      nextIndexToGenerate = 0;
      lastAckedIndex = -1;
      isGenerating = false;
      break;
    }

    default:
      break;
  }
};
