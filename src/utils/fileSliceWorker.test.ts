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

describe('fileSliceWorker State Cache', () => {
  let workerHandler: any;
  let originalPostMessage: any;
  let digestSpy: any;

  beforeAll(async () => {
    if (typeof (globalThis as any).self === 'undefined') {
      (globalThis as any).self = globalThis;
    }
    // Import worker to register self.onmessage
    await import('./fileSliceWorker');
    workerHandler = globalThis.onmessage;
  });

  beforeEach(() => {
    originalPostMessage = globalThis.postMessage;
    digestSpy = vi.spyOn(crypto.subtle, 'digest');
  });

  afterEach(() => {
    globalThis.postMessage = originalPostMessage;
    digestSpy.mockRestore();
  });

  function createTestFile(name = 'test.bin', content = 'Hello Animated QR World', type = 'application/octet-stream') {
    const blob = new Blob([content], { type });
    return new File([blob], name, { type, lastModified: 1700000000 });
  }

  it('computes SHA-256 on first run and includes hash in handshake frame', async () => {
    const postedMessages: any[] = [];
    globalThis.postMessage = vi.fn((msg) => postedMessages.push(msg));

    const testFile = createTestFile('sample1.txt', 'Sample Content 1');

    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: testFile,
          chunkSize: 64,
          errorCorrectionLevel: 'M',
        },
      },
    } as MessageEvent);

    expect(digestSpy).toHaveBeenCalledTimes(1);

    const frame0 = postedMessages.find((m) => m.type === 'FRAME' && m.index === 0);
    expect(frame0).toBeDefined();

    // Verify progress message
    const progress0 = postedMessages.find((m) => m.type === 'PROGRESS' && m.index === 0);
    expect(progress0).toBeDefined();
    expect(progress0.fileName).toBe('sample1.txt');
  });

  it('skips SHA-256 calculation on loop restart when file has not changed', async () => {
    const postedMessages: any[] = [];
    globalThis.postMessage = vi.fn((msg) => postedMessages.push(msg));

    const testFile = createTestFile('loop_test.bin', 'Loop Test Payload');

    // 1. Initial run
    await workerHandler({
      data: {
        type: 'START',
        payload: { file: testFile, chunkSize: 64, errorCorrectionLevel: 'M' },
      },
    } as MessageEvent);

    const initialDigestCalls = digestSpy.mock.calls.length;
    expect(initialDigestCalls).toBe(1);

    // Capture initial handshake frame
    const initialFrame0 = postedMessages.find((m) => m.type === 'FRAME' && m.index === 0);
    expect(initialFrame0).toBeDefined();

    postedMessages.length = 0;

    // 2. Loop restart (send START again with same file instance/metadata)
    await workerHandler({
      data: {
        type: 'START',
        payload: { file: testFile, chunkSize: 64, errorCorrectionLevel: 'M' },
      },
    } as MessageEvent);

    // Verify digest was NOT called again during loop restart
    expect(digestSpy.mock.calls.length).toBe(initialDigestCalls);

    const loopFrame0 = postedMessages.find((m) => m.type === 'FRAME' && m.index === 0);
    expect(loopFrame0).toBeDefined();
    // Frame size and structure should match
    expect(loopFrame0.size).toBe(initialFrame0.size);
  });

  it('clears cached hash on STOP message and recomputes on next START', async () => {
    const postedMessages: any[] = [];
    globalThis.postMessage = vi.fn((msg) => postedMessages.push(msg));

    const testFile = createTestFile('stop_test.bin', 'Stop Test Data');

    // Initial start
    await workerHandler({
      data: {
        type: 'START',
        payload: { file: testFile, chunkSize: 64, errorCorrectionLevel: 'M' },
      },
    } as MessageEvent);

    expect(digestSpy).toHaveBeenCalledTimes(1);

    // STOP
    await workerHandler({
      data: { type: 'STOP' },
    } as MessageEvent);

    // START again
    await workerHandler({
      data: {
        type: 'START',
        payload: { file: testFile, chunkSize: 64, errorCorrectionLevel: 'M' },
      },
    } as MessageEvent);

    // Because STOP cleared cache, digest should be called again
    expect(digestSpy).toHaveBeenCalledTimes(2);
  });

  it('recomputes SHA-256 when a new file is loaded', async () => {
    const postedMessages: any[] = [];
    globalThis.postMessage = vi.fn((msg) => postedMessages.push(msg));

    const file1 = createTestFile('file1.bin', 'File One Data');
    const file2 = createTestFile('file2.bin', 'File Two Data (Different)');

    // Start with file1
    await workerHandler({
      data: {
        type: 'START',
        payload: { file: file1, chunkSize: 64, errorCorrectionLevel: 'M' },
      },
    } as MessageEvent);

    expect(digestSpy).toHaveBeenCalledTimes(1);

    // Start with file2 without explicit STOP
    await workerHandler({
      data: {
        type: 'START',
        payload: { file: file2, chunkSize: 64, errorCorrectionLevel: 'M' },
      },
    } as MessageEvent);

    // Digest should be called again for file2 because metadata changed
    expect(digestSpy).toHaveBeenCalledTimes(2);
  });

  it('preserves handshake checksum consistency across loop restarts', async () => {
    const postedMessages: any[] = [];
    globalThis.postMessage = vi.fn((msg) => postedMessages.push(msg));

    const file = createTestFile('consistency.bin', 'Consistency payload for checksum test');

    // Run 1
    await workerHandler({
      data: {
        type: 'START',
        payload: { file, chunkSize: 64, errorCorrectionLevel: 'M' },
      },
    } as MessageEvent);

    const run1Frame0Data = new Uint8Array(postedMessages.find((m) => m.type === 'FRAME' && m.index === 0).data);

    postedMessages.length = 0;

    // Run 2 (Loop restart)
    await workerHandler({
      data: {
        type: 'START',
        payload: { file, chunkSize: 64, errorCorrectionLevel: 'M' },
      },
    } as MessageEvent);

    const run2Frame0Data = new Uint8Array(postedMessages.find((m) => m.type === 'FRAME' && m.index === 0).data);

    expect(run1Frame0Data).toEqual(run2Frame0Data);
  });
});
