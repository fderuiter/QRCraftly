// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useAdaptiveScanner } from './useAdaptiveScanner';
import { isValidScannerRequest, isValidScannerResponse } from '../utils/scannerContract';

function makeVideoRef() {
  const video = {
    videoWidth: 640,
    videoHeight: 480,
    paused: false,
    ended: false,
  } as any;
  return { current: video } as React.RefObject<HTMLVideoElement | null>;
}

const getActiveWorker = () => globalThis.mockWorkerControl.activeWorker;

describe('useAdaptiveScanner Hook with Bidirectional Buffer Recycling', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Mock requestAnimationFrame & cancelAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 16) as any;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: any) => {
      clearTimeout(id);
    });

    // Mock requestIdleCallback & cancelIdleCallback
    (window as any).requestIdleCallback = vi.fn().mockImplementation((cb: any) => {
      return setTimeout(() => cb(), 0);
    });
    (window as any).cancelIdleCallback = vi.fn().mockImplementation((id: any) => {
      clearTimeout(id);
    });

    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  it('should initialize with correct default states', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    expect(result.current.isScanning).toBe(false);
    expect(result.current.status).toBe('idle');
    expect(result.current.samplingDelay).toBe(33);
    expect(result.current.latencyHistory).toEqual([]);
  });

  it('should start and stop scanning', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    act(() => {
      result.current.startScanning();
    });
    expect(result.current.isScanning).toBe(true);

    act(() => {
      result.current.stopScanning();
    });
    expect(result.current.isScanning).toBe(false);
    expect(result.current.status).toBe('idle');
  });

  it('should successfully pass image buffers as transferables (zero-copy)', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    // Intercept message and reply with a valid payload to avoid mock fallback warnings
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      setTimeout(() => {
        worker.dispatchMessage({
          status: 'pass',
          sequenceId: msg.sequenceId,
          decodedData: 'https://craftly.qr',
          buffer: msg.buffer,
        });
      }, 0);
    });

    act(() => {
      result.current.startScanning();
    });

    // Advance timers with enough time to allow RAF and requestIdleCallback to execute
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const activeWorker = getActiveWorker();
    expect(activeWorker).not.toBeNull();
    expect(activeWorker!.postMessage).toHaveBeenCalled();

    const [payload, transfer] = activeWorker!.postMessage.mock.calls[0];
    expect(payload).toHaveProperty('buffer');
    expect(payload.buffer).toBeInstanceOf(ArrayBuffer);
    expect(payload).toHaveProperty('sequenceId', 1);
    expect(transfer).toBeDefined();
    expect(transfer[0]).toBe(payload.buffer);
    
    // Validate request contract
    expect(isValidScannerRequest(payload)).toBe(true);
  });

  it('should block new frame dispatches while a worker task is in-flight (back-pressure)', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    // Track calls to postMessage
    let postMessageCount = 0;
    globalThis.mockWorkerControl.setInterceptor((_msg, _worker) => {
      postMessageCount++;
      // Do NOT dispatch response yet, keep the request in-flight
    });

    act(() => {
      result.current.startScanning();
    });

    // Advance timers multiple times
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // There should be exactly 1 call to postMessage because the back-pressure guard is in-flight
    expect(postMessageCount).toBe(1);
    expect(result.current.status).toBe('checking');
  });

  it('should resume frame dispatches once the worker responds', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    let activeWorker: any = null;
    let postMessageCalls: any[] = [];
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      activeWorker = worker;
      postMessageCalls.push(msg);
    });

    act(() => {
      result.current.startScanning();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(postMessageCalls).toHaveLength(1);
    const seqId = postMessageCalls[0].sequenceId;
    const arrayBuf = postMessageCalls[0].buffer;

    // Send response back from worker
    act(() => {
      activeWorker.dispatchMessage({
        status: 'pass',
        sequenceId: seqId,
        decodedData: 'https://craftly.qr',
        buffer: arrayBuf,
      });
    });

    expect(result.current.status).toBe('pass');

    // Advance timers to trigger next capture frame
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // It should successfully dispatch the next frame
    expect(postMessageCalls).toHaveLength(2);
    expect(postMessageCalls[1].sequenceId).toBe(2);
  });

  it('should automatically scale down sampling frequency when worker runs take > 100ms', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
        minSamplingDelay: 16,
        maxSamplingDelay: 1000,
      })
    );

    let activeWorker: any = null;
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      activeWorker = worker;
      // Simulate taking 150ms
      setTimeout(() => {
        worker.dispatchMessage({
          status: 'pass',
          sequenceId: msg.sequenceId,
          decodedData: 'https://slow.qr',
          buffer: msg.buffer,
        });
      }, 150);
    });

    act(() => {
      result.current.startScanning();
    });

    // Run frame capture trigger
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const initialDelay = result.current.samplingDelay;

    // Advance by the worker execution duration (150ms) to trigger response
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // The delay should have increased because 150ms > 100ms
    expect(result.current.samplingDelay).toBeGreaterThan(initialDelay);
    expect(result.current.latencyHistory).toHaveLength(1);
    expect(result.current.latencyHistory[0]).toBeGreaterThanOrEqual(140);
  });

  it('should automatically scale up sampling frequency when latency is low (< 40ms)', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
        minSamplingDelay: 10,
        maxSamplingDelay: 1000,
      })
    );

    let activeWorker: any = null;
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      activeWorker = worker;
      // Simulate taking 10ms (low latency)
      setTimeout(() => {
        worker.dispatchMessage({
          status: 'pass',
          sequenceId: msg.sequenceId,
          decodedData: 'https://fast.qr',
          buffer: msg.buffer,
        });
      }, 10);
    });

    act(() => {
      result.current.startScanning();
    });

    // Run capture and complete it
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // The delay should have decreased below the initial 33 because 10ms < 40ms
    expect(result.current.samplingDelay).toBeLessThan(33);
  });

  it('should discard out-of-order worker responses', () => {
    const videoRef = makeVideoRef();
    const successCallback = vi.fn();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
        onScanSuccess: successCallback,
      })
    );

    let activeWorker: any = null;
    let postMessageCalls: any[] = [];
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      activeWorker = worker;
      postMessageCalls.push(msg);
    });

    act(() => {
      result.current.startScanning();
    });

    // 1. Dispatch Frame 1
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(1);
    expect(postMessageCalls[0].sequenceId).toBe(1);

    // Complete Frame 1
    act(() => {
      activeWorker.dispatchMessage({
        status: 'pass',
        sequenceId: 1,
        decodedData: 'https://first.qr',
        buffer: postMessageCalls[0].buffer,
      });
    });
    expect(successCallback).toHaveBeenCalledWith('https://first.qr');
    successCallback.mockClear();

    // 2. Dispatch Frame 2
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(postMessageCalls).toHaveLength(2);
    expect(postMessageCalls[1].sequenceId).toBe(2);

    // Complete Frame 2
    act(() => {
      activeWorker.dispatchMessage({
        status: 'pass',
        sequenceId: 2,
        decodedData: 'https://newest.qr',
        buffer: postMessageCalls[1].buffer,
      });
    });
    expect(successCallback).toHaveBeenCalledWith('https://newest.qr');
    successCallback.mockClear();

    // 3. Late/out-of-order response for Frame 1 arrives
    act(() => {
      activeWorker.dispatchMessage({
        status: 'pass',
        sequenceId: 1,
        decodedData: 'https://stale.qr',
        buffer: postMessageCalls[0].buffer,
      });
    });

    // Success callback should NOT have been called because sequenceId 1 <= completedSequenceRef (2)
    expect(successCallback).not.toHaveBeenCalled();
  });

  it('should strictly limit the pool size to exactly two buffers and recycle them', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    let activeWorker: any = null;
    let postMessageCalls: any[] = [];
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      activeWorker = worker;
      postMessageCalls.push(msg);
    });

    act(() => {
      result.current.startScanning();
    });

    // Capture Frame 1 (uses 1st buffer, leaving 1 in pool)
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(1);
    const buf1 = postMessageCalls[0].buffer;

    // Return the buffer (recycles it, pool should have 2 again)
    act(() => {
      activeWorker.dispatchMessage({
        status: 'fail',
        sequenceId: 1,
        buffer: buf1,
      });
    });

    // Capture Frame 2 (uses recycled buffer)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(postMessageCalls).toHaveLength(2);
    const buf2 = postMessageCalls[1].buffer;
    expect(buf2).toBe(buf1); // Reused!
  });

  it('should recycle returned buffers even if the response sequence is stale', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    let activeWorker: any = null;
    let postMessageCalls: any[] = [];
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      activeWorker = worker;
      postMessageCalls.push(msg);
    });

    act(() => {
      result.current.startScanning();
    });

    // 1. Capture Frame 1 (uses 1st buffer from pool)
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(1);
    const buf1 = postMessageCalls[0].buffer;

    // 2. Complete Frame 1 (recycles buf1, completedSequenceRef becomes 1, pool has 2 again)
    act(() => {
      activeWorker.dispatchMessage({
        status: 'fail',
        sequenceId: 1,
        buffer: buf1,
      });
    });

    // 3. Capture Frame 2 (uses recycled buf1 again)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(postMessageCalls).toHaveLength(2);
    const buf2 = postMessageCalls[1].buffer;
    expect(buf2).toBe(buf1);

    // 4. Send a late stale response for Frame 1 with buf1.
    // Since completedSequenceRef is 1, sequenceId 1 is stale, but we still recycle buf1.
    act(() => {
      activeWorker.dispatchMessage({
        status: 'fail',
        sequenceId: 1,
        buffer: buf1,
      });
    });

    // 5. Complete Frame 2 (recycles buf2 / buf1 again)
    act(() => {
      activeWorker.dispatchMessage({
        status: 'fail',
        sequenceId: 2,
        buffer: buf2,
      });
    });

    // 6. Capture Frame 3
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(postMessageCalls).toHaveLength(3);
    const buf3 = postMessageCalls[2].buffer;
    expect(buf3).toBe(buf1);
  });

  it('should run strict runtime schema validation on worker responses', () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    let activeWorker: any = null;
    let postMessageCalls: any[] = [];
    globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
      activeWorker = worker;
      postMessageCalls.push(msg);
    });

    act(() => {
      result.current.startScanning();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Send an INVALID response (missing buffer)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      activeWorker.dispatchMessage({
        status: 'pass',
        sequenceId: 1,
        decodedData: 'https://broken.qr',
        // missing buffer completely!
      });
    });

    // Should have logged an error and ignored the state updates
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.status).toBe('checking'); // remains checking, wasn't updated to pass!
    consoleErrorSpy.mockRestore();
  });
});
