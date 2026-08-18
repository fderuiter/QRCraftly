// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CameraFrameProvider, FileFrameProvider, sharedBufferPool } from '../src/utils/FrameProvider';
import { resetSharedScannerWorker } from '../src/utils/sharedScannerWorker';

function makeVideoRef() {
  return {
    videoWidth: 640,
    videoHeight: 480,
    paused: false,
    ended: false,
  } as any as HTMLVideoElement;
}

describe('Polymorphic FrameProvider Abstraction Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSharedScannerWorker();

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
    resetSharedScannerWorker();
    sharedBufferPool.clear();
    if (globalThis.mockWorkerControl) {
      globalThis.mockWorkerControl.reset();
    }
  });

  // 1. DoubleBufferPool and Shared Memory Pools
  it('should draw from the same underlying memory buffer pool in both concrete implementations', () => {
    expect(sharedBufferPool.getPoolSize()).toBe(0);

    const video = makeVideoRef();
    const cameraProvider = new CameraFrameProvider(video);
    expect(cameraProvider).toBeDefined();

    const file = new File(['mock_video_data'], 'test.webm', { type: 'video/webm' });
    const fileProvider = new FileFrameProvider(file);
    expect(fileProvider).toBeDefined();

    // Resize pool
    sharedBufferPool.resize(640, 480);
    expect(sharedBufferPool.getPoolSize()).toBe(2);

    const buf1 = sharedBufferPool.acquire();
    expect(buf1).toBeInstanceOf(ArrayBuffer);
    expect(sharedBufferPool.getPoolSize()).toBe(1);

    sharedBufferPool.release(buf1);
    expect(sharedBufferPool.getPoolSize()).toBe(2);
  });

  // 2. CameraFrameProvider Backpressure & Sampling Delay
  it('should block new frame capture requests if a prior frame is actively decoding (backpressure)', () => {
    const video = makeVideoRef();
    const cameraProvider = new CameraFrameProvider(video);

    let postMessageCount = 0;
    globalThis.mockWorkerControl.setInterceptor((_msg, _worker) => {
      postMessageCount++;
    });

    cameraProvider.start();

    // Advance timers
    vi.advanceTimersByTime(200);

    // Should only post 1 message due to backpressure block
    expect(postMessageCount).toBe(1);
    cameraProvider.stop();
  });

  // 3. CameraFrameProvider Starvation Watchdog and Worker Recreation
  it('should automatically recreate background worker thread when a simulated 1500ms stall occurs', () => {
    const video = makeVideoRef();
    const cameraProvider = new CameraFrameProvider(video);

    let activeWorker: any = null;
    globalThis.mockWorkerControl.setInterceptor((_msg, worker) => {
      activeWorker = worker;
    });

    cameraProvider.start();

    // Advance time slightly to trigger first capture
    vi.advanceTimersByTime(10);
    expect(activeWorker).not.toBeNull();

    const initialWorker = activeWorker;
    const terminateSpy = vi.spyOn(initialWorker, 'terminate');

    // Simulate 1510ms elapsed during frame-in-flight
    vi.advanceTimersByTime(1600);

    // Watchdog should trigger worker termination and recreation
    expect(terminateSpy).toHaveBeenCalled();
    cameraProvider.stop();
  });

  // 4. FileFrameProvider single file limit constraint
  it('should restrict uploaded file processing to one file at a time to prevent parallel allocations', async () => {
    const file1 = new File(['video1'], 'video1.webm', { type: 'video/webm' });
    const file2 = new File(['video2'], 'video2.webm', { type: 'video/webm' });

    const provider1 = new FileFrameProvider(file1);
    const provider2 = new FileFrameProvider(file2);

    // Start provider1 (keeps lock active while async video load or metadata load runs)
    const p1Promise = provider1.start();

    // Start provider2 immediately, should throw error due to constraint
    await expect(provider2.start()).rejects.toThrow('An uploaded file is already being processed.');

    // Stop provider 1 and cleanup
    provider1.stop();
    await p1Promise;
  });

  // 5. Telemetry dispatching
  it('should dispatch scanner-telemetry-dispatch custom event when scan session stops', () => {
    const video = makeVideoRef();
    const cameraProvider = new CameraFrameProvider(video);

    const telemetrySpy = vi.fn();
    window.addEventListener('scanner-telemetry-dispatch', telemetrySpy);

    cameraProvider.start();
    cameraProvider.stop();

    expect(telemetrySpy).toHaveBeenCalled();
    const event = telemetrySpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toHaveProperty('latencyHistory');
    expect(event.detail).toHaveProperty('frameDropCount');
    expect(event.detail).toHaveProperty('processingLatency');
    expect(event.detail).toHaveProperty('sessionType', 'camera');

    window.removeEventListener('scanner-telemetry-dispatch', telemetrySpy);
  });

  // 6. Bounded Secondary Fallback Canvas Allocation
  it('should bound secondary fallback canvas allocation to 2048px while preserving aspect ratio and 1024px initial pass', async () => {
    vi.useRealTimers();
    const file = new File(['mock_image'], 'large_photo.jpg', { type: 'image/jpeg' });
    const fileProvider = new FileFrameProvider(file);

    vi.spyOn(fileProvider as any, 'loadImage').mockResolvedValue({
      width: 6000,
      height: 4000,
    } as any);

    const createdCanvases: HTMLCanvasElement[] = [];
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: any) => {
      const el = origCreateElement(tagName, options);
      if (tagName.toLowerCase() === 'canvas') {
        createdCanvases.push(el as HTMLCanvasElement);
      }
      return el;
    });

    try {
      await fileProvider.start();
    } catch {
      // Expected exception when no QR code detected
    }

    expect(createdCanvases.length).toBeGreaterThanOrEqual(2);
    expect(createdCanvases[0].width).toBe(1024);
    expect(createdCanvases[0].height).toBe(683);

    expect(createdCanvases[1].width).toBe(2048);
    expect(createdCanvases[1].height).toBe(1365);
  });

  it('should bound main-thread secondary fallback canvas allocation to 2048px when worker is unavailable', async () => {
    vi.useRealTimers();
    const file = new File(['mock_image'], 'large_photo.jpg', { type: 'image/jpeg' });
    const fileProvider = new FileFrameProvider(file);

    vi.spyOn(fileProvider as any, 'loadImage').mockResolvedValue({
      width: 4000,
      height: 6000,
    } as any);

    const sharedWorkerMod = await import('../src/utils/sharedScannerWorker');
    vi.spyOn(sharedWorkerMod, 'getSharedScannerWorker').mockReturnValue(null as any);

    const createdCanvases: HTMLCanvasElement[] = [];
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: any) => {
      const el = origCreateElement(tagName, options);
      if (tagName.toLowerCase() === 'canvas') {
        createdCanvases.push(el as HTMLCanvasElement);
      }
      return el;
    });

    try {
      await fileProvider.start();
    } catch {
      // Expected exception when no QR code detected
    }

    expect(createdCanvases.length).toBeGreaterThanOrEqual(2);
    expect(createdCanvases[0].width).toBe(683);
    expect(createdCanvases[0].height).toBe(1024);

    expect(createdCanvases[1].width).toBe(1365);
    expect(createdCanvases[1].height).toBe(2048);
  });
});
