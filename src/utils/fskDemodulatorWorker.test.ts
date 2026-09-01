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

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  SYNC_FREQ,
  ZERO_FREQ,
  ONE_FREQ,
  isFskWorkerRequest,
  assertFskWorkerRequest,
  isFskWorkerResponse,
  assertFskWorkerResponse,
  FskWorkerRequest,
  FskWorkerResponse,
} from './fskDemodulatorContract';

describe('fskDemodulatorContract & fskDemodulatorWorker', () => {
  describe('fskDemodulatorContract Validation', () => {
    it('validates a valid init request', () => {
      const req: FskWorkerRequest = { type: 'init', sampleRate: 44100, fftSize: 2048 };
      expect(isFskWorkerRequest(req)).toBe(true);
      expect(() => assertFskWorkerRequest(req)).not.toThrow();
    });

    it('validates a valid process request with ArrayBuffer', () => {
      const buffer = new ArrayBuffer(1024);
      const req: FskWorkerRequest = { type: 'process', buffer };
      expect(isFskWorkerRequest(req)).toBe(true);
      expect(() => assertFskWorkerRequest(req)).not.toThrow();
    });

    it('validates a valid reset request', () => {
      const req: FskWorkerRequest = { type: 'reset' };
      expect(isFskWorkerRequest(req)).toBe(true);
      expect(() => assertFskWorkerRequest(req)).not.toThrow();
    });

    it('rejects invalid request payloads', () => {
      expect(isFskWorkerRequest(null)).toBe(false);
      expect(isFskWorkerRequest({})).toBe(false);
      expect(isFskWorkerRequest({ type: 'invalid' })).toBe(false);
      expect(isFskWorkerRequest({ type: 'init', sampleRate: -1, fftSize: 2048 })).toBe(false);
      expect(isFskWorkerRequest({ type: 'process', buffer: 'not a buffer' })).toBe(false);

      expect(() => assertFskWorkerRequest(null)).toThrow('FSK Worker request must be a non-null object');
      expect(() => assertFskWorkerRequest({ type: 'init', sampleRate: -1, fftSize: 2048 })).toThrow(
        'FSK Worker init request sampleRate must be a positive number'
      );
      expect(() => assertFskWorkerRequest({ type: 'init', sampleRate: 44100, fftSize: 0 })).toThrow(
        'FSK Worker init request fftSize must be a positive number'
      );
      expect(() => assertFskWorkerRequest({ type: 'process', buffer: null })).toThrow(
        'FSK Worker process request buffer must be an ArrayBuffer'
      );
      expect(() => assertFskWorkerRequest({ type: 'unknown' })).toThrow(
        'FSK Worker request must have a valid type ("init", "process", or "reset")'
      );
    });

    it('validates and asserts FSK Worker responses', () => {
      const res: FskWorkerResponse = {
        type: 'fsk_response',
        symbol: 'SYNC TONE',
        decodedMessage: 'H',
        logs: ['Decoded bit: 0'],
        buffer: new ArrayBuffer(1024),
      };
      expect(isFskWorkerResponse(res)).toBe(true);
      expect(() => assertFskWorkerResponse(res)).not.toThrow();

      expect(isFskWorkerResponse(null)).toBe(false);
      expect(isFskWorkerResponse({ type: 'other' })).toBe(false);

      expect(() => assertFskWorkerResponse(null)).toThrow('FSK Worker response must be a non-null object');
      expect(() => assertFskWorkerResponse({ type: 'bad' })).toThrow('FSK Worker response type must be "fsk_response"');
      expect(() => assertFskWorkerResponse({ type: 'fsk_response', symbol: 123, buffer: new ArrayBuffer(10) })).toThrow(
        'FSK Worker response symbol must be a string'
      );
      expect(() => assertFskWorkerResponse({ type: 'fsk_response', symbol: 'A', buffer: null })).toThrow(
        'FSK Worker response buffer must be an ArrayBuffer'
      );
      expect(() =>
        assertFskWorkerResponse({ type: 'fsk_response', symbol: 'A', buffer: new ArrayBuffer(10), decodedMessage: 123 })
      ).toThrow('FSK Worker response decodedMessage must be a string if provided');
      expect(() =>
        assertFskWorkerResponse({ type: 'fsk_response', symbol: 'A', buffer: new ArrayBuffer(10), logs: 'not array' })
      ).toThrow('FSK Worker response logs must be an array of strings if provided');
    });
  });

  describe('fskDemodulatorWorker Thread Logic', () => {
    let workerHandler: any;
    let originalPostMessage: any;

    beforeAll(async () => {
      if (typeof (globalThis as any).self === 'undefined') {
        (globalThis as any).self = globalThis;
      }
      await import('./fskDemodulatorWorker');
      workerHandler = globalThis.onmessage;
    });

    beforeEach(() => {
      originalPostMessage = globalThis.postMessage;
      vi.clearAllMocks();
    });

    afterEach(() => {
      globalThis.postMessage = originalPostMessage;
    });

    it('initializes worker configuration on init message', () => {
      const postMessageSpy = vi.fn();
      globalThis.postMessage = postMessageSpy;

      workerHandler({
        data: {
          type: 'init',
          sampleRate: 44100,
          fftSize: 2048,
        },
      } as MessageEvent);

      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('resets demodulator state on reset message', () => {
      const postMessageSpy = vi.fn();
      globalThis.postMessage = postMessageSpy;

      workerHandler({
        data: {
          type: 'reset',
        },
      } as MessageEvent);

      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('detects silence when FFT amplitudes are below threshold', () => {
      const postMessageSpy = vi.fn();
      globalThis.postMessage = postMessageSpy;

      const buffer = new ArrayBuffer(1024);
      workerHandler({
        data: {
          type: 'process',
          buffer,
        },
      } as MessageEvent);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      const [response, transfer] = postMessageSpy.mock.calls[0];
      expect(response.type).toBe('fsk_response');
      expect(response.symbol).toBe('Silence / Gap');
      expect(response.buffer).toBe(buffer);
      expect(transfer).toEqual([buffer]);
    });

    it('detects sync tone, decodes bits, and reconstructs ASCII character', () => {
      const postMessageSpy = vi.fn();
      globalThis.postMessage = postMessageSpy;

      const sampleRate = 44100;
      const fftSize = 2048;
      const binWidth = sampleRate / fftSize;
      const syncBin = Math.round(SYNC_FREQ / binWidth);
      const zeroBin = Math.round(ZERO_FREQ / binWidth);
      const oneBin = Math.round(ONE_FREQ / binWidth);

      workerHandler({
        data: { type: 'init', sampleRate, fftSize },
      } as MessageEvent);

      // 1. Send Sync Tone Frame
      let buffer = new ArrayBuffer(1024);
      let view = new Uint8Array(buffer);
      view[syncBin] = 200; // Above threshold 135

      workerHandler({
        data: { type: 'process', buffer },
      } as MessageEvent);

      expect(postMessageSpy).toHaveBeenCalled();
      let lastCall = postMessageSpy.mock.calls[postMessageSpy.mock.calls.length - 1][0];
      expect(lastCall.symbol).toBe('SYNC TONE');

      // 2. Send 8 Bits for character 'A' (ASCII 65 = 01000001) with silent gaps between bits
      const bits = '01000001';
      let now = Date.now();
      const dateSpy = vi.spyOn(Date, 'now');

      for (let i = 0; i < bits.length; i++) {
        // Gap frame (silence) to reset expectingBit
        now += 50;
        dateSpy.mockReturnValue(now);
        workerHandler({
          data: { type: 'process', buffer: new ArrayBuffer(1024) },
        } as MessageEvent);

        // Bit frame
        now += 50;
        dateSpy.mockReturnValue(now);

        buffer = new ArrayBuffer(1024);
        view = new Uint8Array(buffer);
        const targetBin = bits[i] === '1' ? oneBin : zeroBin;
        view[targetBin] = 200;

        workerHandler({
          data: { type: 'process', buffer },
        } as MessageEvent);
      }

      dateSpy.mockRestore();

      lastCall = postMessageSpy.mock.calls[postMessageSpy.mock.calls.length - 1][0];
      expect(lastCall.decodedMessage).toBe('A');
      expect(lastCall.logs).toEqual(expect.arrayContaining([expect.stringContaining("Decoded Character: 'A'")]));
    });
  });
});
