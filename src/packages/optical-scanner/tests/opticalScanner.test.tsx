// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  scan,
  getDownscaledDimensions,
  isValidScannerRequest,
  isValidScannerResponse,
  assertScannerRequest,
  assertScannerResponse,
  DoubleBufferPool,
  AdaptiveFrameScheduler,
  resetScannerWorker,
} from '../index';

describe('Optical Detection Engine — Deep Module Seam Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetScannerWorker();

    if (typeof ImageData === 'undefined') {
      (globalThis as any).ImageData = class ImageData {
        data: Uint8ClampedArray;
        width: number;
        height: number;
        constructor(w: number, h: number) {
          this.width = w;
          this.height = h;
          this.data = new Uint8ClampedArray(w * h * 4);
        }
      };
    }

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
  });

  describe('Dimension scaling mathematics', () => {
    it('should scale down wide aspect ratios proportionally to max dimension', () => {
      const { width, height } = getDownscaledDimensions(2000, 1000, 1000);
      expect(width).toBe(1000);
      expect(height).toBe(500);
    });

    it('should scale down tall aspect ratios proportionally to max dimension', () => {
      const { width, height } = getDownscaledDimensions(800, 2400, 1200);
      expect(width).toBe(400);
      expect(height).toBe(1200);
    });

    it('should preserve dimensions within bounds', () => {
      const { width, height } = getDownscaledDimensions(640, 480, 1280);
      expect(width).toBe(640);
      expect(height).toBe(480);
    });

    it('should handle zero or negative dimensions defensively', () => {
      expect(getDownscaledDimensions(0, 0)).toEqual({ width: 0, height: 0 });
      expect(getDownscaledDimensions(-10, 50)).toEqual({ width: 0, height: 0 });
    });
  });

  describe('Contract assertions & type guards', () => {
    it('should validate valid scanner responses', () => {
      const valid = {
        status: 'pass' as const,
        sequenceId: 42,
        decodedData: 'https://qrcraftly.com',
      };
      expect(isValidScannerResponse(valid)).toBe(true);
      expect(() => assertScannerResponse(valid)).not.toThrow();
    });

    it('should reject invalid scanner responses', () => {
      expect(isValidScannerResponse(null)).toBe(false);
      expect(isValidScannerResponse({ status: 'invalid', sequenceId: 1 })).toBe(false);
      expect(() => assertScannerResponse({ status: 'bad' })).toThrow();
    });

    it('should reject invalid scanner requests', () => {
      expect(isValidScannerRequest({})).toBe(false);
      expect(() => assertScannerRequest({})).toThrow();
    });
  });

  describe('DoubleBufferPool memory management', () => {
    it('should preallocate two buffers on resize and recycle within limits', () => {
      const pool = new DoubleBufferPool(100, 100, 4);
      expect(pool.getPoolSize()).toBe(2);

      const buf1 = pool.acquire();
      const buf2 = pool.acquire();
      expect(buf1.byteLength).toBe(100 * 100 * 4);
      expect(pool.getPoolSize()).toBe(0);

      // Allocates fallback dynamically when pool is exhausted
      const buf3 = pool.acquire();
      expect(buf3.byteLength).toBe(100 * 100 * 4);

      // Recycling
      pool.release(buf1);
      pool.release(buf2);
      expect(pool.getPoolSize()).toBe(2);

      pool.clear();
      expect(pool.getPoolSize()).toBe(0);
    });
  });

  describe('AdaptiveFrameScheduler backpressure and latency pacing', () => {
    it('should apply backpressure lock when a frame is already in flight', () => {
      const scheduler = new AdaptiveFrameScheduler();
      scheduler.start();

      const seq1 = scheduler.beginFrame();
      expect(seq1).toBe(1);
      expect(scheduler.getInFlight()).toBe(true);

      // Second frame blocked by backpressure
      const seq2 = scheduler.beginFrame();
      expect(seq2).toBeNull();

      // Completing frame releases backpressure
      scheduler.endFrame(1, 'fail');
      expect(scheduler.getInFlight()).toBe(false);

      const seq3 = scheduler.beginFrame();
      expect(seq3).toBe(2);
      scheduler.stop();
    });

    it('should trip starvation watchdog when in-flight request stalls past timeout', () => {
      const onWatchdog = vi.fn();
      const scheduler = new AdaptiveFrameScheduler({
        onWatchdogTriggered: onWatchdog,
      });
      scheduler.start();
      scheduler.beginFrame();

      // Advance clock past 1500ms watchdog threshold
      vi.advanceTimersByTime(1600);

      expect(onWatchdog).toHaveBeenCalled();
      expect(scheduler.getInFlight()).toBe(false); // Backpressure released
      scheduler.stop();
    });

    it('should dynamically throttle delay when median latency exceeds 100ms', () => {
      const onDelayChange = vi.fn();
      const scheduler = new AdaptiveFrameScheduler({
        onDelayChange,
      });
      scheduler.start();

      // Complete 5 slow frames
      for (let i = 1; i <= 5; i++) {
        scheduler.beginFrame();
        vi.advanceTimersByTime(150);
        scheduler.endFrame(i, 'pass', 'test');
      }

      expect(scheduler.getSamplingDelay()).toBeGreaterThan(100);
      scheduler.stop();
    });
  });

  describe('Polymorphic scan() entry-point seam', () => {
    it('should process blank ImageData and return pass/fail with duration', async () => {
      const blankData = new ImageData(100, 100);
      const result = await scan(blankData);

      expect(result.status).toBe('fail');
      expect(result.data).toBeNull();
      expect(result.error).toBe('NO_QR_DETECTED');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should gracefully handle abort signals', async () => {
      const controller = new AbortController();
      controller.abort();

      const blankData = new ImageData(50, 50);
      const result = await scan(blankData, { signal: controller.signal });

      expect(result.status).toBe('fail');
      expect(result.error).toBe('ABORTED');
    });

    it('should scan an HTMLCanvasElement source', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;

      const result = await scan(canvas);
      expect(result.status).toBe('fail');
      expect(result.error).toBe('NO_QR_DETECTED');
    });
  });
});
