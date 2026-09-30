// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jsQR from 'jsqr';

vi.mock('jsqr', () => {
  return {
    default: vi.fn(),
  };
});

const liveWorkers: Worker[] = [];

/** Poll often: these checks wait on real worker round-trips, which are slower under coverage. */
const WAIT = { timeout: 5000, interval: 2 };

/** The real scannability worker module, run in-thread by the global Worker from vitest.setup.ts. */
const createScannabilityWorker = async () => {
  const worker = new Worker(new URL('../src/packages/scannability/worker.ts', import.meta.url), { type: 'module' });
  liveWorkers.push(worker);
  // Wait until the module is evaluated so the timing assertions below measure message handling only.
  await (worker as unknown as { ready: Promise<void> }).ready;
  return worker;
};

describe('High-Fidelity Worker Concurrency & Serialization Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  afterEach(() => {
    // Stop every worker so no in-flight decode from one test leaks jsQR calls into the next.
    liveWorkers.splice(0).forEach(worker => worker.terminate());
    vi.clearAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  // Requirement 1 / Acceptance Criteria 1: Non-serializable payload fails
  it('should fail/throw synchronously if a non-serializable payload (such as a function) is passed to postMessage', async () => {
    const worker = await createScannabilityWorker();
    
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

  it('should succeed/not throw if a fully serializable payload is passed to postMessage', async () => {
    const worker = await createScannabilityWorker();
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
    const worker = await createScannabilityWorker();
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
    await vi.waitFor(() => expect(receivedResponse?.configId).toBe('sec-check'), WAIT);

    expect(receivedResponse).toEqual({
      success: false,
      physicalReady: false,
      error: 'SECURITY_VIOLATION',
      configId: 'sec-check',
      localContrastViolations: 0,
      minLocalContrast: 21,
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

    await vi.waitFor(() => expect(receivedResponse?.configId).toBe('safe-check'), WAIT);

    expect(receivedResponse).toEqual({
      success: true,
      physicalReady: true,
      configId: 'safe-check',
      localContrastViolations: 0,
      minLocalContrast: 21,
    });
  });

  // Requirement 3 & 4 / Acceptance Criteria 3: Queue delay and dropping stale responses
  it('should support programmable delay and handle sequential backpressure, discarding out-of-order/stale responses', async () => {
    // Enable delay of 30ms and sequential execution (concurrency limit = 1)
    globalThis.mockWorkerControl.setDelay(30);
    globalThis.mockWorkerControl.setConcurrencyLimit(1);

    const worker = await createScannabilityWorker();
    const responses: any[] = [];
    const finishedAt: number[] = [];
    worker.onmessage = (e: any) => {
      responses.push(e.data);
      finishedAt.push(performance.now());
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

    // With a 30ms delay nothing can finish within the first 15ms.
    await new Promise<void>(resolve => setTimeout(resolve, 15));
    expect(responses).toHaveLength(0);

    // With a concurrency limit of 1 the tasks finish strictly one after another, in order,
    // each at least one delay after the previous one. Lower bounds only, so a slow run
    // (for example under coverage instrumentation) cannot fail this.
    await vi.waitFor(() => expect(responses).toHaveLength(1), WAIT);
    expect(responses[0].configId).toBe('task-1');

    await vi.waitFor(() => expect(responses).toHaveLength(2), WAIT);
    expect(responses[1].configId).toBe('task-2');
    expect(finishedAt[1] - finishedAt[0]).toBeGreaterThanOrEqual(25);

    await vi.waitFor(() => expect(responses).toHaveLength(3), WAIT);
    expect(responses[2].configId).toBe('task-3');
    expect(finishedAt[2] - finishedAt[1]).toBeGreaterThanOrEqual(25);
  });

  // Requirement 1, 2, 4 & Acceptance Criteria 1, 2: Two-pass sequence of dontInvert followed by an
  // attemptBoth fallback, in both the digital and the physical check (see scannabilitySteps).
  it('should execute standard decoding (dontInvert) followed by an inverted fallback pass (attemptBoth)', async () => {
    const worker = await createScannabilityWorker();
    let receivedResponse: any = null;
    worker.onmessage = (e: any) => {
      receivedResponse = e.data;
    };

    const optionsPassed: any[] = [];
    vi.mocked(jsQR).mockImplementation((data: any, width: number, height: number, options?: any) => {
      optionsPassed.push(options?.inversionAttempts);
      if (options?.inversionAttempts === 'attemptBoth') {
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

    await vi.waitFor(() => expect(receivedResponse?.configId).toBe('inverted-test'), WAIT);

    // Verify two-pass sequence (digital check followed by physical check) was followed with onlyInvert fallback
    expect(optionsPassed).toEqual(['dontInvert', 'attemptBoth', 'dontInvert', 'attemptBoth']);
    expect(optionsPassed).not.toContain('onlyInvert');
    expect(receivedResponse).toEqual({
      success: true,
      physicalReady: true,
      configId: 'inverted-test',
      localContrastViolations: 0,
      minLocalContrast: 21,
    });
  });
});
