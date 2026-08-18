// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jsQR from 'jsqr';

vi.mock('jsqr', () => {
  return {
    default: vi.fn(),
  };
});

describe('High-Fidelity Worker Concurrency & Serialization Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  // Requirement 1 / Acceptance Criteria 1: Non-serializable payload fails
  it('should fail/throw synchronously if a non-serializable payload (such as a function) is passed to postMessage', () => {
    const worker = new Worker('mock-url');
    
    // Passing a function should throw a structuredClone/DataCloneError
    expect(() => {
      worker.postMessage({
        handler: () => { console.log('hello'); }
      });
    }).toThrow();

    // Passing a DOM element (if document is present) should throw as well
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      expect(() => {
        worker.postMessage({
          element: div
        });
      }).toThrow();
    }
  });

  it('should succeed/not throw if a fully serializable payload is passed to postMessage', () => {
    const worker = new Worker('mock-url');
    expect(() => {
      worker.postMessage({
        imageData: {
          data: new Uint8ClampedArray(100),
          width: 5,
          height: 5,
        },
        width: 5,
        height: 5,
        isTest: true,
        configId: '1',
      });
    }).not.toThrow();
  });

  // Requirement 2 / Acceptance Criteria 2: Executing exact optical and security checks used in production
  it('should execute actual worker logic and run optical/security checks dynamically', async () => {
    const worker = new Worker('mock-url');
    let receivedResponse: any = null;
    worker.onmessage = (e: any) => {
      receivedResponse = e.data;
    };

    // Use mockImplementation to isolate mock data specifically to this test's parameters
    vi.mocked(jsQR).mockImplementation((data: any) => {
      if (data && data.length === 400) {
        return { data: 'javascript:alert(1)' } as any;
      }
      return null;
    });

    worker.postMessage({
      imageData: {
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      },
      width: 10,
      height: 10,
      isTest: true,
      configId: 'sec-check',
    });

    // Wait for the asynchronous task to complete
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    expect(receivedResponse).toEqual({
      success: false,
      physicalReady: false,
      error: 'SECURITY_VIOLATION',
      configId: 'sec-check',
    });

    // 2. Let's test a safe payload
    vi.mocked(jsQR).mockImplementation((data: any) => {
      if (data && data.length === 400) {
        return { data: 'https://safe.com' } as any;
      }
      return null;
    });

    worker.postMessage({
      imageData: {
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      },
      width: 10,
      height: 10,
      isTest: true,
      configId: 'safe-check',
    });

    await new Promise<void>(resolve => setTimeout(resolve, 50));

    expect(receivedResponse).toEqual({
      success: true,
      physicalReady: true,
      configId: 'safe-check',
    });
  });

  // Requirement 3 & 4 / Acceptance Criteria 3: Queue delay and dropping stale responses
  it('should support programmable delay and handle sequential backpressure, discarding out-of-order/stale responses', async () => {
    // Enable delay of 30ms and sequential execution (concurrency limit = 1)
    globalThis.mockWorkerControl.setDelay(30);
    globalThis.mockWorkerControl.setConcurrencyLimit(1);

    const worker = new Worker('mock-url');
    const responses: any[] = [];
    worker.onmessage = (e: any) => {
      responses.push(e.data);
    };

    vi.mocked(jsQR).mockReturnValue({ data: 'https://safe.com' } as any);

    // Send three requests rapidly.
    // Due to concurrency limit = 1 and delay = 30ms, they should queue up and finish in order at t=30ms, t=60ms, t=90ms
    worker.postMessage({
      imageData: { data: new Uint8ClampedArray(400), width: 10, height: 10 },
      width: 10, height: 10, isTest: true, configId: 'task-1'
    });
    worker.postMessage({
      imageData: { data: new Uint8ClampedArray(400), width: 10, height: 10 },
      width: 10, height: 10, isTest: true, configId: 'task-2'
    });
    worker.postMessage({
      imageData: { data: new Uint8ClampedArray(400), width: 10, height: 10 },
      width: 10, height: 10, isTest: true, configId: 'task-3'
    });

    // At t=15ms, none should have completed
    await new Promise<void>(resolve => setTimeout(resolve, 15));
    expect(responses).toHaveLength(0);

    // At t=45ms, task-1 should have completed
    await new Promise<void>(resolve => setTimeout(resolve, 30));
    expect(responses).toHaveLength(1);
    expect(responses[0].configId).toBe('task-1');

    // At t=75ms, task-2 should have completed
    await new Promise<void>(resolve => setTimeout(resolve, 30));
    expect(responses).toHaveLength(2);
    expect(responses[1].configId).toBe('task-2');

    // At t=105ms, task-3 should have completed
    await new Promise<void>(resolve => setTimeout(resolve, 30));
    expect(responses).toHaveLength(3);
    expect(responses[2].configId).toBe('task-3');
  });

  // Requirement 1, 2, 4 & Acceptance Criteria 1, 2: Two-pass sequence of dontInvert followed by onlyInvert
  it('should execute standard decoding (dontInvert) followed by inverted-only decoding (onlyInvert) without attemptBoth', async () => {
    const worker = new Worker('mock-url');
    let receivedResponse: any = null;
    worker.onmessage = (e: any) => {
      receivedResponse = e.data;
    };

    const optionsPassed: any[] = [];
    vi.mocked(jsQR).mockImplementation((data: any, width: number, height: number, options?: any) => {
      optionsPassed.push(options?.inversionAttempts);
      if (options?.inversionAttempts === 'onlyInvert') {
        return { data: 'https://inverted-qr.com' } as any;
      }
      return null;
    });

    worker.postMessage({
      imageData: {
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      },
      width: 10,
      height: 10,
      isTest: true,
      configId: 'inverted-test',
    });

    await new Promise<void>(resolve => setTimeout(resolve, 50));

    // Verify two-pass sequence (digital check followed by physical check) was followed with onlyInvert fallback
    expect(optionsPassed).toEqual(['dontInvert', 'onlyInvert', 'dontInvert', 'onlyInvert']);
    expect(optionsPassed).not.toContain('attemptBoth');
    expect(receivedResponse).toEqual({
      success: true,
      physicalReady: true,
      configId: 'inverted-test',
    });
  });
});
