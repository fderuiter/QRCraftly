import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import jsQR from 'jsqr';

vi.mock('jsqr', () => {
  return {
    default: vi.fn(),
  };
});

describe('scannabilityWorker', () => {
  let workerHandler: any;
  let originalPostMessage: any;
  let originalImageData: any;

  beforeAll(async () => {
    originalImageData = globalThis.ImageData;
    class MockImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    }
    globalThis.ImageData = MockImageData as any;

    // Dynamically import once to set self.onmessage and capture it
    await import('./scannabilityWorker');
    workerHandler = globalThis.onmessage;
  });

  beforeEach(() => {
    originalPostMessage = globalThis.postMessage;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.postMessage = originalPostMessage;
  });

  const createDummyRequest = (configId = '123', isTest = true) => {
    return {
      imageData: {
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      },
      width: 10,
      height: 10,
      configId,
      isTest,
    };
  };

  it('sets self.onmessage and processes safe digital pass and physical pass request', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    // Control mocks
    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any); // physical

    expect(workerHandler).toBeDefined();

    // Trigger handler
    await workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: true,
      configId: '123',
    });
  });

  it('handles safe digital pass but physical scan failure', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital
                  .mockReturnValueOnce(null); // physical fails (dontInvert)
    vi.mocked(jsQR).mockReturnValueOnce(null); // physical fails (attemptBoth)

    await workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: false,
      configId: '123',
    });
  });

  it('handles dangerous URLs via ValidationEngine as security violation', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'javascript:alert(1)' } as any);

    await workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'SECURITY_VIOLATION',
      configId: '123',
    });
  });

  it('handles case where first digital scan fails but second (attemptBoth) passes', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce(null) // digital 1 fails
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital 2 passes
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any); // physical passes

    await workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: true,
      configId: '123',
    });
  });

  it('handles case where both digital scans fail', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce(null) // digital 1 fails
                  .mockReturnValueOnce(null); // digital 2 fails

    await workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'NOT_FOUND',
      configId: '123',
    });
  });

  it('applies optical simulation math when isTest is false', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any); // physical

    await workerHandler({ data: createDummyRequest('123', false) } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: true,
      configId: '123',
    });
  });

  it('catches validation error if the payload is invalid', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    // Send invalid payload to trigger isWorkerRequest/assertWorkerRequest validation error
    await workerHandler({ data: { invalidPayload: true } } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'VALIDATION_ERROR',
      configId: undefined,
    });
  });

  it('catches crash error if global processing fails internally', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockImplementation(() => {
      throw new Error('Simulation crash');
    });

    await workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'CRASH',
      configId: '123',
    });
  });

  it('handles postMessage crash fallback when postMessage throws', async () => {
    // Make postMessage throw first time to trigger catch fallback
    globalThis.postMessage = vi.fn().mockImplementationOnce(() => {
      throw new Error('postMessage crash');
    });

    await workerHandler({ data: { invalidPayload: true } } as MessageEvent);

    // Should fall back to posting basic crash payload
    expect(globalThis.postMessage).toHaveBeenCalledTimes(2);
  });

  it('handles falsy e.data or non-object e.data gracefully', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    // Send null data
    await workerHandler({ data: null } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'VALIDATION_ERROR',
      configId: undefined,
    });
  });

  it('handles case where first physical scan fails but second physical scan passes', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital passes
                  .mockReturnValueOnce(null) // physical 1 fails
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any); // physical 2 passes

    await workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: true,
      configId: '123',
    });
  });

  it('cooperatively cancels older execution sequence when a newer configId is dispatched', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    // Mock responses
    vi.mocked(jsQR).mockReturnValue({ data: 'https://safe.com' } as any);

    // Dispatch two requests: '101' and then '102'
    const firstPromise = workerHandler({ data: createDummyRequest('101') } as MessageEvent);
    const secondPromise = workerHandler({ data: createDummyRequest('102') } as MessageEvent);

    await Promise.all([firstPromise, secondPromise]);

    // Only '102' should have successfully called postMessage; '101' should have cooperatively aborted without posting.
    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        physicalReady: true,
        configId: '102',
      })
    );
  });

  it('recycles pre-allocated double-buffer ArrayBuffer back to main thread in postMessage transfer list', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://safe.com' } as any)
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any);

    const buffer = new ArrayBuffer(400);
    const req = {
      imageData: {
        data: new Uint8ClampedArray(buffer),
        width: 10,
        height: 10,
      },
      buffer,
      width: 10,
      height: 10,
      configId: 'buf-123',
      sequenceId: 1,
      isTest: true,
    };

    await workerHandler({ data: req } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        success: true,
        physicalReady: true,
        configId: 'buf-123',
        sequenceId: 1,
        buffer,
      },
      [buffer]
    );
  });

  it('falls back seamlessly to JS decoding if WebAssembly instantiation fails', async () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    const originalInstantiate = globalThis.WebAssembly.instantiate;
    // Force WebAssembly.instantiate to throw
    globalThis.WebAssembly.instantiate = vi.fn().mockRejectedValue(new Error('WASM instantiation failed'));

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://fallback.com' } as any)
                  .mockReturnValueOnce({ data: 'https://fallback.com' } as any);

    await workerHandler({ data: createDummyRequest('wasm-fail-1') } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        physicalReady: true,
        configId: 'wasm-fail-1',
      })
    );

    globalThis.WebAssembly.instantiate = originalInstantiate;
  });
});
