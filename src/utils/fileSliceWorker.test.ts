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
import QRCode from 'qrcode';

describe('fileSliceWorker', () => {
  let workerHandler: any;
  let originalPostMessage: any;

  beforeAll(async () => {
    if (typeof (globalThis as any).self === 'undefined') {
      (globalThis as any).self = globalThis;
    }
    // Mock the global crypto subtly to avoid dependency issues if needed, but page.test already defined it
    if (!globalThis.crypto) {
      (globalThis as any).crypto = {
        subtle: {
          digest: async () => new Uint8Array(32).buffer
        }
      };
    }
    await import('./fileSliceWorker');
    workerHandler = (globalThis as any).self.onmessage;
  });

  beforeEach(() => {
    originalPostMessage = (globalThis as any).postMessage;
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).postMessage = originalPostMessage;
    // Clear any active state by stopping the worker
    if (workerHandler) {
      workerHandler({ data: { type: 'STOP' } });
    }
  });

  it('scales the lookahead window based on target FPS', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const dummyBlob = new Blob(['hello world'], { type: 'text/plain' });

    // Start with 60 FPS, lookahead should scale to at least 12 (Math.ceil(60 * 0.2) = 12)
    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 1,
          fps: 60
        }
      }
    });

    // Wait for the pipeline processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // The worker should generate up to lookaheadLimit + 1 frames (the handshake frame at index 0 + lookaheadLimit frames)
    // For 60 FPS, lookahead limit is 12. So nextIndexToGenerate can generate up to lastAckedIndex + 12.
    // lastAckedIndex starts at -1, so it generates indices 0 to 11 (12 frames total)
    const frameCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'FRAME');
    expect(frameCalls.length).toBe(12);
  });

  it('bounds the lookahead window to a maximum of 16 to prevent memory exhaustion', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const dummyBlob = new Blob([new Uint8Array(100)], { type: 'application/octet-stream' });

    // Set 120 FPS, lookahead scales but is bounded to a maximum of 16 frames
    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 1,
          fps: 120
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const frameCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'FRAME');
    // lastAckedIndex starts at -1. Capped at 16, so it generates indices 0 to 15 (16 frames)
    expect(frameCalls.length).toBe(16);
  });

  it('caches the SHA-256 hash across transfer restarts', async () => {
    const digestSpy = vi.spyOn(globalThis.crypto.subtle, 'digest');
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const dummyBlob = new Blob(['caching test'], { type: 'text/plain' });

    // First start
    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 5,
          fps: 15
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    const firstCallCount = digestSpy.mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    // Stop and restart
    await workerHandler({ data: { type: 'STOP' } });
    digestSpy.mockClear();

    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 5,
          fps: 15
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    // Should NOT have computed the hash again
    expect(digestSpy.mock.calls.length).toBe(0);
  });

  it('supports HEAL to resume frame generation from a specific ACK point', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const dummyBlob = new Blob([new Uint8Array(50)], { type: 'application/octet-stream' });

    // Start with 15 FPS, lookahead is 3
    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 2,
          fps: 15
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    // Initially with lookahead 3 and lastAckedIndex = -1, it generates indices 0, 1, 2 (3 frames)
    let frameCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'FRAME');
    expect(frameCalls.length).toBe(3);

    // Clear postMessage mock to count subsequent generation
    postMessageSpy.mockClear();

    // Send HEAL with lastAckedIndex = 1
    await workerHandler({
      data: {
        type: 'HEAL',
        payload: {
          lastAckedIndex: 1
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    // Now lookahead limit allows generating up to 1 + 3 = 4 (indices 3 and 4)
    frameCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'FRAME');
    expect(frameCalls.map(c => c[0].index)).toContain(3);
    expect(frameCalls.map(c => c[0].index)).toContain(4);
  });

  it('handles ACK messages and generates next frames up to lookahead limit', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const dummyBlob = new Blob([new Uint8Array(20)], { type: 'application/octet-stream' });

    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 5,
          fps: 15
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    postMessageSpy.mockClear();

    await workerHandler({
      data: {
        type: 'ACK',
        payload: {
          index: 0
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const progressCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'PROGRESS');
    expect(progressCalls.length).toBe(1);
    expect(progressCalls[0][0].index).toBe(1);

    const frameCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'FRAME');
    expect(frameCalls.length).toBe(1);
    expect(frameCalls[0][0].index).toBe(3);
  });

  it('sends COMPLETE when last frame is ACKed', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const dummyBlob = new Blob(['one'], { type: 'text/plain' });

    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 5,
          fps: 15
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    postMessageSpy.mockClear();

    await workerHandler({
      data: {
        type: 'ACK',
        payload: { index: 0 }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 10));

    await workerHandler({
      data: {
        type: 'ACK',
        payload: { index: 1 }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 10));

    const completeCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'COMPLETE');
    expect(completeCalls.length).toBe(1);
  });

  it('posts ERROR message when SHA-256 computation fails', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const digestSpy = vi.spyOn(globalThis.crypto.subtle, 'digest').mockRejectedValueOnce(new Error('Mocked hash error'));
    const dummyBlob = new Blob(['hash fail'], { type: 'text/plain' });

    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 5,
          fps: 15
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const errorCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'ERROR');
    expect(errorCalls.length).toBe(1);
    expect(errorCalls[0][0].message).toContain('Hashing failed: Mocked hash error');

    digestSpy.mockRestore();
  });

  it('ignores unknown message types', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    await workerHandler({
      data: {
        type: 'UNKNOWN_TYPE_BLABLA'
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('posts ERROR message when QRCode.create throws an error during frame generation', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const createSpy = vi.spyOn(QRCode, 'create').mockImplementationOnce(() => {
      throw new Error('Mocked QR creation failure');
    });

    const dummyBlob = new Blob(['one'], { type: 'text/plain' });

    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 5,
          fps: 15
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const errorCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'ERROR');
    expect(errorCalls.length).toBe(1);
    expect(errorCalls[0][0].message).toContain('Failed to generate frame 0: Mocked QR creation failure');

    createSpy.mockRestore();
  });

  it('posts ERROR message when START payload has no file', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: undefined,
          chunkSize: 5,
          fps: 15
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const errorCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'ERROR');
    expect(errorCalls.length).toBe(1);
    expect(errorCalls[0][0].message).toBe('No file provided');
  });

  it('covers remaining edge case branches of fileSliceWorker', async () => {
    const postMessageSpy = vi.fn();
    (globalThis as any).postMessage = postMessageSpy;

    const dummyBlob = new Blob(['fallback fps test'], { type: 'text/plain' });
    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: dummyBlob,
          chunkSize: 5
        }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 10));

    postMessageSpy.mockClear();
    await workerHandler({
      data: {
        type: 'ACK',
        payload: { index: -2 }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(postMessageSpy).not.toHaveBeenCalled();

    await workerHandler({
      data: {
        type: 'HEAL'
      }
    });
    await workerHandler({
      data: {
        type: 'HEAL',
        payload: {}
      }
    });
    await workerHandler({
      data: {
        type: 'HEAL',
        payload: { lastAckedIndex: 'not a number' }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 10));

    await workerHandler({ data: { type: 'STOP' } });

    const freshBlob = new Blob(['fresh unique hash fail content'], { type: 'text/plain' });
    const digestSpy = vi.spyOn(globalThis.crypto.subtle, 'digest').mockRejectedValueOnce('Mocked string hash error');
    postMessageSpy.mockClear();
    await workerHandler({
      data: {
        type: 'START',
        payload: {
          file: freshBlob,
          chunkSize: 5
        }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    const errorCalls = postMessageSpy.mock.calls.filter(c => c[0].type === 'ERROR');
    expect(errorCalls.length).toBe(1);
    expect(errorCalls[0][0].message).toBe('Hashing failed: Mocked string hash error');

    digestSpy.mockRestore();
  });
});

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
    workerHandler = (globalThis as any).self.onmessage || globalThis.onmessage;
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
