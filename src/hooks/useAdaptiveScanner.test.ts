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

  it('should successfully pass image bitmaps as transferables (zero-copy)', () => {
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
    expect(payload).toHaveProperty('image');
    expect(payload.image).toBeInstanceOf(ImageBitmap);
    expect(payload).toHaveProperty('sequenceId', 1);
    expect(transfer).toBeDefined();
    expect(transfer[0]).toBe(payload.image);
    
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

  it('should create and transfer new ImageBitmap instances for each capture frame', () => {
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

    // Capture Frame 1
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(1);
    const img1 = postMessageCalls[0].image;
    expect(img1).toBeInstanceOf(ImageBitmap);

    // Complete Frame 1
    act(() => {
      activeWorker.dispatchMessage({
        status: 'fail',
        sequenceId: 1,
      });
    });

    // Capture Frame 2
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(postMessageCalls).toHaveLength(2);
    const img2 = postMessageCalls[1].image;
    expect(img2).toBeInstanceOf(ImageBitmap);
    expect(img2).not.toBe(img1); // New instance created each time
  });

  it('should ignore stale responses and discard them', () => {
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

    // 1. Capture Frame 1
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(1);

    // 2. Complete Frame 1
    act(() => {
      activeWorker.dispatchMessage({
        status: 'fail',
        sequenceId: 1,
      });
    });

    // 3. Capture Frame 2
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(postMessageCalls).toHaveLength(2);

    // 4. Send a late stale response for Frame 1
    act(() => {
      activeWorker.dispatchMessage({
        status: 'pass',
        sequenceId: 1,
        decodedData: 'https://stale.qr',
      });
    });

    // The status should still be 'checking' (since Frame 2 is in-flight) and NOT have updated to 'pass' from the stale response
    expect(result.current.status).toBe('checking');
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

    // Send an INVALID response (missing status)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      activeWorker.dispatchMessage({
        sequenceId: 1,
        decodedData: 'https://broken.qr',
        // missing status completely!
      });
    });

    // Should have logged an error and ignored the state updates
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.status).toBe('checking'); // remains checking, wasn't updated!
    consoleErrorSpy.mockRestore();
  });

  it('should identify a video element as a local video file versus live webcam', () => {
    // 1. Live camera (srcObject set)
    const videoWithStream = {
      videoWidth: 640,
      videoHeight: 480,
      paused: false,
      ended: false,
      srcObject: {},
    } as any;
    
    // 2. Local video file (src or currentSrc set, srcObject falsy)
    const videoWithFile = {
      videoWidth: 640,
      videoHeight: 480,
      paused: true,
      ended: false,
      src: 'blob:http://localhost/test.mp4',
      srcObject: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    const initialVideoRef = { current: videoWithStream } as any;

    const { result, rerender } = renderHook(
      ({ videoRef }) => useAdaptiveScanner({ videoRef }),
      { initialProps: { videoRef: initialVideoRef } }
    );

    act(() => {
      result.current.startScanning();
    });

    // For webcam, addEventListener should NOT have been called (Webcam Isolation)
    expect(videoWithFile.addEventListener).not.toHaveBeenCalled();

    // Rerender with video file (using a new stable ref for the file)
    const fileVideoRef = { current: videoWithFile } as any;
    rerender({ videoRef: fileVideoRef });

    // Since it's a file, we should have attached listeners
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(videoWithFile.addEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
    expect(videoWithFile.addEventListener).toHaveBeenCalledWith('seeked', expect.any(Function));
  });

  it('should attach and remove event listeners when switching inputs and unmounting', () => {
    const videoWithFile = {
      videoWidth: 640,
      videoHeight: 480,
      paused: true,
      ended: false,
      src: 'blob:http://localhost/test.mp4',
      srcObject: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    const videoRef = { current: videoWithFile } as any;

    const { result, unmount } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    act(() => {
      result.current.startScanning();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(videoWithFile.addEventListener).toHaveBeenCalled();
    expect(videoWithFile.removeEventListener).not.toHaveBeenCalled();

    // Clean up on unmount
    unmount();
    expect(videoWithFile.removeEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
    expect(videoWithFile.removeEventListener).toHaveBeenCalledWith('seeked', expect.any(Function));
  });

  it('should trigger frame capture immediately when paused video file is active', () => {
    let postMessageCalls: any[] = [];
    globalThis.mockWorkerControl.setInterceptor((msg) => {
      postMessageCalls.push(msg);
    });

    const videoWithFile = {
      videoWidth: 640,
      videoHeight: 480,
      paused: true, // paused!
      ended: false,
      src: 'blob:http://localhost/test.mp4',
      srcObject: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    const videoRef = { current: videoWithFile } as any;

    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    act(() => {
      result.current.startScanning();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // It should have triggered a capture immediately despite being paused!
    expect(postMessageCalls).not.toHaveLength(0);
  });

  it('should trigger single frame capture on pause and seeked events', () => {
    let postMessageCalls: any[] = [];
    globalThis.mockWorkerControl.setInterceptor((msg) => {
      postMessageCalls.push(msg);
    });

    const registeredEvents: Record<string, Function> = {};
    const videoWithFile = {
      videoWidth: 640,
      videoHeight: 480,
      paused: true,
      ended: false,
      src: 'blob:http://localhost/test.mp4',
      srcObject: null,
      addEventListener: vi.fn().mockImplementation((event, handler) => {
        registeredEvents[event] = handler;
      }),
      removeEventListener: vi.fn(),
    } as any;

    const videoRef = { current: videoWithFile } as any;

    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    act(() => {
      result.current.startScanning();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Clear initial capture call
    postMessageCalls.length = 0;

    // Trigger seeked event
    expect(registeredEvents['seeked']).toBeDefined();
    act(() => {
      registeredEvents['seeked']();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Seek should trigger a frame capture
    expect(postMessageCalls).toHaveLength(1);

    // Clear and trigger pause event
    postMessageCalls.length = 0;
    expect(registeredEvents['pause']).toBeDefined();
    act(() => {
      registeredEvents['pause']();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Pause should trigger a frame capture
    expect(postMessageCalls).toHaveLength(1);
  });

  it('should not recreate or tear down the frame capture loop when sampling delay changes', () => {
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
      // Simulate fast response (10ms) to trigger a sampling delay change
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

    // Advance timers so first capture and loop are fully scheduled
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Spy on cancelAnimationFrame to detect effect teardown / loop recreation
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame');

    // Trigger worker response which shifts the delay
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Ensure sampling delay actually shifted
    expect(result.current.samplingDelay).toBeLessThan(33);

    // Assert that cancelAnimationFrame was NOT called to tear down the loop
    expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
    cancelAnimationFrameSpy.mockRestore();
  });

  it('should recover and continue scanning after a simulated worker thread crash', () => {
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

    // Advance to trigger first frame capture
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(postMessageCalls).toHaveLength(1);
    expect(result.current.status).toBe('checking');

    const firstWorker = activeWorker;
    expect(firstWorker).not.toBeNull();

    // Now, simulate worker crash (trigger error)
    act(() => {
      firstWorker.dispatchError(new Error('Simulated thread crash'));
    });

    // Worker should have been recreated, and activeWorker should be a new instance
    const secondWorker = getActiveWorker();
    expect(secondWorker).not.toBe(firstWorker);
    expect(firstWorker.terminate).toHaveBeenCalled();

    // Advance timers further to allow the next loop tick to capture a new frame
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // A second frame should be dispatched on the new worker
    expect(postMessageCalls).toHaveLength(2);
    expect(postMessageCalls[1].sequenceId).toBe(2);
  });

  it('should detect starvation when worker takes >1500ms and auto-restart', () => {
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

    // Trigger first frame capture
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(postMessageCalls).toHaveLength(1);
    const firstWorker = activeWorker;

    // Advance by 1600ms (exceeding 1500ms starvation threshold)
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    // Starvation should be detected, and worker recreated
    const secondWorker = getActiveWorker();
    expect(secondWorker).not.toBe(firstWorker);
    expect(firstWorker.terminate).toHaveBeenCalled();

    // Advance timers further to allow the next loop tick to capture a new frame
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(postMessageCalls).toHaveLength(2);
    expect(postMessageCalls[1].sequenceId).toBe(2);
  });

  it('should halt scanning and notify user if consecutive restarts exceed 3', () => {
    const videoRef = makeVideoRef();
    const failCallback = vi.fn();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
        onScanFail: failCallback,
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

    // Trigger first frame capture
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(postMessageCalls).toHaveLength(1);
    
    // Simulate 3 consecutive worker crashes
    // Crash 1 -> Recreate 1
    act(() => {
      activeWorker.dispatchError(new Error('Crash 1'));
    });
    expect(result.current.isScanning).toBe(true);

    // Let next frame dispatch on newly recreated worker
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(2);

    // Crash 2 -> Recreate 2
    act(() => {
      activeWorker.dispatchError(new Error('Crash 2'));
    });
    expect(result.current.isScanning).toBe(true);

    // Let next frame dispatch on newly recreated worker
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(3);

    // Crash 3 -> Recreate 3
    act(() => {
      activeWorker.dispatchError(new Error('Crash 3'));
    });
    expect(result.current.isScanning).toBe(true);

    // Let next frame dispatch on newly recreated worker
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(4);

    // Crash 4 -> Should exceed limit (3 retries) and stop scanning
    act(() => {
      activeWorker.dispatchError(new Error('Crash 4'));
    });

    // Scanning should be stopped
    expect(result.current.isScanning).toBe(false);

    // User should be notified with the expected error message
    expect(failCallback).toHaveBeenCalledWith(
      "The scanner background worker crashed repeatedly. Please restart the page or check your camera."
    );
  });

  it('should terminate the currently active (recreated) worker when the hook unmounts', () => {
    const videoRef = makeVideoRef();
    const { unmount } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
      })
    );

    const initialWorker = getActiveWorker();
    expect(initialWorker).not.toBeNull();

    // Trigger a simulated worker thread crash to force recreation
    act(() => {
      initialWorker.dispatchError(new Error('Simulated thread crash'));
    });

    const recreatedWorker = getActiveWorker();
    expect(recreatedWorker).not.toBeNull();
    expect(recreatedWorker).not.toBe(initialWorker);
    expect(initialWorker.terminate).toHaveBeenCalled();
    expect(recreatedWorker.terminate).not.toHaveBeenCalled();

    // Unmount the hook
    unmount();

    // The recreated worker should have been terminated
    expect(recreatedWorker.terminate).toHaveBeenCalled();
  });

  it('should batch and throttle updates to 250ms when running in production environment', () => {
    // Override NODE_ENV and VITEST to simulate production environment
    const oldNodeEnv = process.env.NODE_ENV;
    const oldVitestEnv = process.env.VITEST;
    process.env.NODE_ENV = 'production';
    delete process.env.VITEST;

    try {
      const videoRef = makeVideoRef();
      const { result } = renderHook(() =>
        useAdaptiveScanner({
          videoRef,
        })
      );

      act(() => {
        result.current.startScanning();
      });

      let activeWorker: any = null;
      let lastMsg: any = null;
      globalThis.mockWorkerControl.setInterceptor((msg, worker) => {
        activeWorker = worker;
        lastMsg = msg;
        worker.dispatchMessage({
          status: 'pass',
          sequenceId: msg.sequenceId,
          decodedData: 'https://throttled.qr',
          buffer: msg.buffer,
        });
      });

      // Advance time to capture first frame and auto-respond
      act(() => {
        vi.advanceTimersByTime(50);
      });

      expect(lastMsg).not.toBeNull();

      // Since we are in production, the state should NOT have flushed yet!
      // Status should still be 'idle' (initial state) and samplingDelay should be initial 33
      expect(result.current.status).toBe('idle');
      expect(result.current.samplingDelay).toBe(33);

      // Now advance time by 100ms (not yet 250ms)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.status).toBe('idle');
      expect(result.current.samplingDelay).toBe(33);

      // Now advance time to reach/exceed the 250ms throttle threshold
      act(() => {
        vi.advanceTimersByTime(150); // Total 250ms from start of scanning/interval
      });

      // Now it should be flushed!
      expect(result.current.status).toBe('pass');
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
      if (oldVitestEnv !== undefined) {
        process.env.VITEST = oldVitestEnv;
      }
    }
  });

  it('should implement Hook-Level Optimization Bypass for stale frames (STALE_FRAME)', () => {
    const videoRef = makeVideoRef();
    const successCallback = vi.fn();
    const failCallback = vi.fn();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
        onScanSuccess: successCallback,
        onScanFail: failCallback,
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

    // Trigger frame capture to generate sequenceId = 1
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(postMessageCalls).toHaveLength(1);
    const sentMessage = postMessageCalls[0];
    expect(sentMessage.sequenceId).toBe(1);
    expect(result.current.status).toBe('checking');

    // Now, dispatch a STALE_FRAME response from the worker
    act(() => {
      activeWorker.dispatchMessage({
        status: 'fail',
        sequenceId: 1,
        error: 'STALE_FRAME',
        buffer: sentMessage.buffer,
      });
    });

    // 1. Consumer callbacks must NOT be triggered
    expect(successCallback).not.toHaveBeenCalled();
    expect(failCallback).not.toHaveBeenCalled();

    // 2. State/status must remain unchanged (skip public status updates)
    expect(result.current.status).toBe('checking');

    // 3. Speed metrics/latency should ignore the dropped frame
    expect(result.current.latencyHistory).toEqual([]);

    // 4. Memory/Buffer should be recycled, allowing the next captured frames to immediately run
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(2);
    expect(postMessageCalls[1].sequenceId).toBe(2);
  });

  it('should ignore older out-of-order stale frames and not clear active in-flight status', () => {
    const videoRef = makeVideoRef();
    const successCallback = vi.fn();
    const failCallback = vi.fn();
    const { result } = renderHook(() =>
      useAdaptiveScanner({
        videoRef,
        onScanSuccess: successCallback,
        onScanFail: failCallback,
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

    // Dispatch frame 1
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(1);
    expect(postMessageCalls[0].sequenceId).toBe(1);

    // Complete frame 1 successfully
    act(() => {
      activeWorker.dispatchMessage({
        status: 'pass',
        sequenceId: 1,
        decodedData: 'QR_CODE_DATA',
        buffer: postMessageCalls[0].buffer,
      });
    });
    expect(successCallback).toHaveBeenCalledWith('QR_CODE_DATA');
    expect(result.current.status).toBe('pass');

    // Now capture frame 2
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(2);
    expect(postMessageCalls[1].sequenceId).toBe(2);

    // Now, dispatch delayed STALE_FRAME for frame 1 (out-of-order)
    act(() => {
      activeWorker.dispatchMessage({
        status: 'fail',
        sequenceId: 1,
        error: 'STALE_FRAME',
        buffer: postMessageCalls[0].buffer,
      });
    });

    // It should not clear the in-flight block of frame 2!
    // If we try to capture frame 3, it should be blocked since frame 2 is still in-flight.
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(postMessageCalls).toHaveLength(2); // Still 2, frame 3 was blocked!
  });
});
