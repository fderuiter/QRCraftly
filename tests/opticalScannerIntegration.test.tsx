// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { scan } from '@/packages/optical-scanner';
import {
  sharedBufferPool,
  AdaptiveFrameScheduler,
  resetScannerWorker,
} from '@/packages/optical-scanner/scheduler';
import { useQrScanner } from '@/packages/optical-scanner/client';

function makeVideoRef() {
  return {
    videoWidth: 640,
    videoHeight: 480,
    paused: false,
    ended: false,
  } as any as HTMLVideoElement;
}

describe('Optical Detection Engine — Unified Package Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetScannerWorker();

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 16) as any;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: any) => {
      clearTimeout(id);
    });

    (window as any).requestIdleCallback = vi.fn().mockImplementation((cb: any) => {
      return setTimeout(() => cb(), 0);
    });
    (window as any).cancelIdleCallback = vi.fn().mockImplementation((id: any) => {
      clearTimeout(id);
    });

    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }

    global.Image = class {
      onload: any = null;
      onerror: any = null;
      _src: string = '';
      width = 100;
      height = 100;
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
      get src() {
        return this._src;
      }
    } as any;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      }),
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetScannerWorker();
    sharedBufferPool.clear();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  // 1. DoubleBufferPool and Shared Memory Pools
  it('should draw from the preallocated double buffer pool and resize properly', () => {
    expect(sharedBufferPool.getPoolSize()).toBe(0);

    sharedBufferPool.resize(640, 480);
    expect(sharedBufferPool.getPoolSize()).toBe(2);

    const buf1 = sharedBufferPool.acquire();
    expect(buf1).toBeInstanceOf(ArrayBuffer);
    expect(sharedBufferPool.getPoolSize()).toBe(1);

    sharedBufferPool.release(buf1);
    expect(sharedBufferPool.getPoolSize()).toBe(2);
  });

  // 2. Camera Backpressure & Sampling Delay via useQrScanner
  it('should block new frame capture requests if a prior frame is actively decoding (backpressure)', () => {
    const videoNode = makeVideoRef();
    const videoRef = { current: videoNode };

    let postMessageCount = 0;
    globalThis.mockWorkerControl.setInterceptor((_msg, _worker) => {
      postMessageCount++;
    });

    const { result } = renderHook(() =>
      useQrScanner({
        videoRef,
      })
    );

    act(() => {
      result.current.startScanning();
    });

    vi.advanceTimersByTime(200);

    // Should only post 1 message due to backpressure block
    expect(postMessageCount).toBe(1);

    act(() => {
      result.current.stopScanning();
    });
  });

  // 3. Starvation Watchdog and Worker Recreation
  it('should automatically recreate background worker thread when a simulated 1500ms stall occurs', () => {
    const videoNode = makeVideoRef();
    const videoRef = { current: videoNode };

    let activeWorker: any = null;
    globalThis.mockWorkerControl.setInterceptor((_msg, worker) => {
      activeWorker = worker;
    });

    const { result } = renderHook(() =>
      useQrScanner({
        videoRef,
      })
    );

    act(() => {
      result.current.startScanning();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(activeWorker).not.toBeNull();

    const initialWorker = activeWorker;
    const terminateSpy = vi.spyOn(initialWorker, 'terminate');

    // Advance timers past 1500ms watchdog threshold
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(terminateSpy).toHaveBeenCalled();

    act(() => {
      result.current.stopScanning();
    });
  });

  // 4. Telemetry dispatching
  it('should dispatch scanner-telemetry-dispatch custom event when scan session stops', () => {
    const videoNode = makeVideoRef();
    const videoRef = { current: videoNode };

    const telemetrySpy = vi.fn();
    window.addEventListener('scanner-telemetry-dispatch', telemetrySpy);

    const { result } = renderHook(() =>
      useQrScanner({
        videoRef,
      })
    );

    act(() => {
      result.current.startScanning();
      result.current.stopScanning();
    });

    expect(telemetrySpy).toHaveBeenCalled();
    const event = telemetrySpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toHaveProperty('latencyHistory');
    expect(event.detail).toHaveProperty('frameDropCount');
    expect(event.detail).toHaveProperty('processingLatency');
    expect(event.detail).toHaveProperty('sessionType', 'camera');

    window.removeEventListener('scanner-telemetry-dispatch', telemetrySpy);
  });

  // 5. AbortSignal integration tests
  it('should accept AbortSignal and abort file processing gracefully', async () => {
    const controller = new AbortController();
    controller.abort();

    const file = new File(['mock_image_data'], 'test.png', { type: 'image/png' });
    const res = await scan(file, { signal: controller.signal });

    expect(res.status).toBe('fail');
    expect(res.error).toBe('ABORTED');
  });

  // 6. Unified file scanning via useQrScanner
  it('should expose scanFile directly on useQrScanner hook', async () => {
    const { result } = renderHook(() => useQrScanner());

    const file = new File(['mock_image'], 'test.png', { type: 'image/png' });
    const scanPromise = result.current.scanFile(file);
    await vi.runAllTimersAsync();
    const scanRes = await scanPromise;

    expect(scanRes).toBeDefined();
    expect(scanRes.status).toBe('fail');
    expect(scanRes.error).toContain('No QR code detected');
  });
});
