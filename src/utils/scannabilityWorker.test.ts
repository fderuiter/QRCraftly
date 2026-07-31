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

  it('sets self.onmessage and processes safe digital pass and physical pass request', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    // Control mocks
    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any); // physical

    expect(workerHandler).toBeDefined();

    // Trigger handler
    workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: true,
      configId: '123',
    });
  });

  it('handles safe digital pass but physical scan failure', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital
                  .mockReturnValueOnce(null); // physical fails (dontInvert)
    vi.mocked(jsQR).mockReturnValueOnce(null); // physical fails (attemptBoth)

    workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: false,
      configId: '123',
    });
  });

  it('handles dangerous URLs via ValidationEngine as security violation', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'javascript:alert(1)' } as any);

    workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'SECURITY_VIOLATION',
      configId: '123',
    });
  });

  it('handles case where first digital scan fails but second (attemptBoth) passes', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce(null) // digital 1 fails
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital 2 passes
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any); // physical passes

    workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: true,
      configId: '123',
    });
  });

  it('handles case where both digital scans fail', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce(null) // digital 1 fails
                  .mockReturnValueOnce(null); // digital 2 fails

    workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'NOT_FOUND',
      configId: '123',
    });
  });

  it('applies optical simulation math when isTest is false', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any); // physical

    workerHandler({ data: createDummyRequest('123', false) } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: true,
      configId: '123',
    });
  });

  it('catches validation error if the payload is invalid', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    // Send invalid payload to trigger isWorkerRequest/assertWorkerRequest validation error
    workerHandler({ data: { invalidPayload: true } } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'VALIDATION_ERROR',
      configId: undefined,
    });
  });

  it('catches crash error if global processing fails internally', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockImplementation(() => {
      throw new Error('Simulation crash');
    });

    workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'CRASH',
      configId: '123',
    });
  });

  it('handles postMessage crash fallback when postMessage throws', () => {
    // Make postMessage throw first time to trigger catch fallback
    globalThis.postMessage = vi.fn().mockImplementationOnce(() => {
      throw new Error('postMessage crash');
    });

    workerHandler({ data: { invalidPayload: true } } as MessageEvent);

    // Should fall back to posting basic crash payload
    expect(globalThis.postMessage).toHaveBeenCalledTimes(2);
  });

  it('handles falsy e.data or non-object e.data gracefully', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    // Send null data
    workerHandler({ data: null } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: false,
      physicalReady: false,
      error: 'VALIDATION_ERROR',
      configId: undefined,
    });
  });

  it('handles case where first physical scan fails but second physical scan passes', () => {
    const postMessageSpy = vi.fn();
    globalThis.postMessage = postMessageSpy;

    vi.mocked(jsQR).mockReturnValueOnce({ data: 'https://safe.com' } as any) // digital passes
                  .mockReturnValueOnce(null) // physical 1 fails
                  .mockReturnValueOnce({ data: 'https://safe.com' } as any); // physical 2 passes

    workerHandler({ data: createDummyRequest() } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledWith({
      success: true,
      physicalReady: true,
      configId: '123',
    });
  });
});
