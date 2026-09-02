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

import {
  SYNC_FREQ,
  ZERO_FREQ,
  ONE_FREQ,
  AMPLITUDE_THRESHOLD,
  BIT_TOLERANCE,
  isFskWorkerRequest,
  assertFskWorkerRequest,
  assertFskWorkerResponse,
  FskProcessResponse,
} from './fskDemodulatorContract';

let sampleRate = 44100;
let fftSize = 2048;
let binWidth = sampleRate / fftSize;

let syncBin = Math.round(SYNC_FREQ / binWidth);
let zeroBin = Math.round(ZERO_FREQ / binWidth);
let oneBin = Math.round(ONE_FREQ / binWidth);

let minSearchBin = Math.round(900 / binWidth);
let maxSearchBin = Math.round(2500 / binWidth);

let isReceiving = false;
let bitBuffer: string[] = [];
let currentBitStream = '';
let expectingBit = true;
let lastDecodedTime = 0;

function recalculateBins() {
  binWidth = sampleRate / fftSize;
  syncBin = Math.round(SYNC_FREQ / binWidth);
  zeroBin = Math.round(ZERO_FREQ / binWidth);
  oneBin = Math.round(ONE_FREQ / binWidth);
  minSearchBin = Math.round(900 / binWidth);
  maxSearchBin = Math.round(2500 / binWidth);
}

function resetDemodulatorState() {
  isReceiving = false;
  bitBuffer = [];
  currentBitStream = '';
  expectingBit = true;
  lastDecodedTime = 0;
}

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  if (!isFskWorkerRequest(data)) {
    try {
      assertFskWorkerRequest(data);
    } catch (err: any) {
      console.error('Invalid FSK Worker Request received:', err);
      return;
    }
  }

  if (data.type === 'init') {
    sampleRate = data.sampleRate;
    fftSize = data.fftSize;
    recalculateBins();
    resetDemodulatorState();
    return;
  }

  if (data.type === 'reset') {
    resetDemodulatorState();
    return;
  }

  if (data.type === 'process') {
    const { buffer } = data;
    if (!buffer || !(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
      return;
    }
    const dataArray = new Uint8Array(buffer);

    let maxVal = 0;
    let peakBin = -1;
    for (let b = minSearchBin; b <= maxSearchBin; b++) {
      if (dataArray[b] > maxVal) {
        maxVal = dataArray[b];
        peakBin = b;
      }
    }

    const now = Date.now();
    let currentSymbol = 'Silence / Gap';
    const logs: string[] = [];
    let messageUpdated = false;

    if (maxVal > AMPLITUDE_THRESHOLD && peakBin !== -1) {
      const distSync = Math.abs(peakBin - syncBin);
      const distZero = Math.abs(peakBin - zeroBin);
      const distOne = Math.abs(peakBin - oneBin);

      const minDistance = Math.min(distSync, distZero, distOne);

      if (minDistance <= BIT_TOLERANCE) {
        if (minDistance === distSync) {
          currentSymbol = 'SYNC TONE';
          if (!isReceiving && now - lastDecodedTime > 1000) {
            isReceiving = true;
            bitBuffer = [];
            currentBitStream = '';
            expectingBit = true;
            lastDecodedTime = now;
            logs.push('⚡ Sync tone detected! Initializing receiver matrix...');
            messageUpdated = true;
          }
        } else if (isReceiving && expectingBit && now - lastDecodedTime > 80) {
          if (minDistance === distZero) {
            currentSymbol = 'BIT 0';
            bitBuffer.push('0');
            lastDecodedTime = now;
            expectingBit = false;
            logs.push('Decoded bit: 0');
          } else if (minDistance === distOne) {
            currentSymbol = 'BIT 1';
            bitBuffer.push('1');
            lastDecodedTime = now;
            expectingBit = false;
            logs.push('Decoded bit: 1');
          }

          if (bitBuffer.length >= 8) {
            const byteString = bitBuffer.join('');
            const charCode = parseInt(byteString, 2);
            const char = String.fromCharCode(charCode);
            currentBitStream += char;
            logs.push(`📥 Decoded Character: '${char}' (Hex: ${charCode.toString(16).toUpperCase()})`);
            messageUpdated = true;
            bitBuffer = [];
          }
        }
      } else {
        currentSymbol = 'Noise / Unrecognized';
      }
    } else {
      currentSymbol = 'Silence / Gap';
      if (!expectingBit && now - lastDecodedTime > 40) {
        expectingBit = true;
      }
    }

    const response: FskProcessResponse = {
      type: 'fsk_response',
      symbol: currentSymbol,
      decodedMessage: messageUpdated ? currentBitStream : undefined,
      logs: logs.length > 0 ? logs : undefined,
      buffer: buffer,
    };

    assertFskWorkerResponse(response);

    // Transfer array buffer back to host thread for zero-copy memory recycling
    (self as any).postMessage(response, [buffer]);
  }
};
