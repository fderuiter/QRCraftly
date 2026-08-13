import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { QRConfig, QRType, QRStyle, QRErrorCorrectionLevel, SocialFormat, TemplateStyle } from '../types';

describe('mazeWorker', () => {
  let workerHandler: any;
  let originalPostMessage: any;

  beforeAll(async () => {
    if (typeof (globalThis as any).self === 'undefined') {
      (globalThis as any).self = globalThis;
    }
    // Capture the worker's onmessage handler
    await import('./mazeWorker');
    workerHandler = globalThis.onmessage;
  });

  beforeEach(() => {
    originalPostMessage = globalThis.postMessage;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.postMessage = originalPostMessage;
  });

  const createDummyConfig = (value = 'https://example.com'): QRConfig => ({
    value,
    type: QRType.URL,
    fgColor: '#000000',
    bgColor: '#ffffff',
    style: QRStyle.STANDARD,
    logoUrl: null,
    logoSize: 0.15,
    logoPaddingStyle: 'none',
    logoPadding: 0,
    logoBackgroundColor: '#ffffff',
    eyeColor: '#000000',
    errorCorrectionLevel: QRErrorCorrectionLevel.M,
    isBorderEnabled: false,
    borderSize: 0,
    borderColor: '#000000',
    borderStyle: 'solid',
    borderText: '',
    borderTextPosition: 'top-center',
    borderTextColor: '#000000',
    borderLogoUrl: null,
    borderLogoPosition: 'bottom-center',
    socialFormat: SocialFormat.SQUARE_1_1,
    templateStyle: TemplateStyle.NONE,
  });

  const createMockGrid = (size: number): Uint8Array => {
    return new Uint8Array(size * size); // all light modules initially
  };

  it('generates maze and sends success message with serialized transferable objects', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    const size = 21;
    await workerHandler({
      data: {
        grid: createMockGrid(size),
        size,
        config: createDummyConfig(),
        sequenceId: 1,
      },
    } as MessageEvent);

    // Give time for timeout yields to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(postMessageSpy).toHaveBeenCalled();
    const lastCall = postMessageSpy.mock.calls[postMessageSpy.mock.calls.length - 1];
    const data = lastCall[0];
    const transferables = lastCall[1];

    expect(data.status).toBe('success');
    expect(data.sequenceId).toBe(1);
    expect(data.nodes).toBeInstanceOf(Int16Array);
    expect(data.edges).toBeInstanceOf(Int16Array);
    expect(data.start).toBeInstanceOf(Int16Array);
    expect(data.end).toBeInstanceOf(Int16Array);
    expect(data.solution).toBeInstanceOf(Int16Array);

    // Assert that transferables lists their underlying ArrayBuffers for zero-copy
    expect(transferables).toBeInstanceOf(Array);
    expect(transferables.length).toBe(5);
    expect(transferables).toContain(data.nodes.buffer);
    expect(transferables).toContain(data.edges.buffer);
    expect(transferables).toContain(data.start.buffer);
    expect(transferables).toContain(data.end.buffer);
    expect(transferables).toContain(data.solution.buffer);
  });

  it('fails input validation if grid is not Uint8Array', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    await workerHandler({
      data: {
        grid: [] as any, // invalid
        size: 21,
        config: createDummyConfig(),
        sequenceId: 2,
      },
    } as MessageEvent);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(postMessageSpy).toHaveBeenCalledWith({
      status: 'error',
      sequenceId: 2,
      error: expect.stringContaining('grid must be a Uint8Array'),
    });
  });

  it('discards stale requests based on sequenceId tracking', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    const size = 21;
    // Dispatch a request with sequenceId = 3, then a newer request with sequenceId = 4
    const p1 = workerHandler({
      data: {
        grid: createMockGrid(size),
        size,
        config: createDummyConfig('Request 3'),
        sequenceId: 3,
      },
    } as MessageEvent);

    const p2 = workerHandler({
      data: {
        grid: createMockGrid(size),
        size,
        config: createDummyConfig('Request 4'),
        sequenceId: 4,
      },
    } as MessageEvent);

    await Promise.all([p1, p2]);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const postedSequenceIds = postMessageSpy.mock.calls.map(call => call[0].sequenceId);
    expect(postedSequenceIds).not.toContain(3);
    expect(postedSequenceIds).toContain(4);
  });
});
