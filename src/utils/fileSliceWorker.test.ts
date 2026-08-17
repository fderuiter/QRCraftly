import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

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
});
