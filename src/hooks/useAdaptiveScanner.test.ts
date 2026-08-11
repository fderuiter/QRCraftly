// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useAdaptiveScanner } from './useAdaptiveScanner';

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

describe('useAdaptiveScanner Hook', () => {
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
    expect(payload).toHaveProperty('imageData');
    expect(payload).toHaveProperty('sequenceId', 1);
    expect(transfer).toBeDefined();
    expect(transfer[0]).toBe(payload.imageData.data.buffer);
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

    // Send response back from worker
    act(() => {
      activeWorker.dispatchMessage({
        status: 'pass',
        sequenceId: seqId,
        decodedData: 'https://craftly.qr',
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
      });
    });

    // Success callback should NOT have been called because sequenceId 1 <= completedSequenceRef (2)
    expect(successCallback).not.toHaveBeenCalled();
  });
});
