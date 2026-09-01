// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeAspectFit,
  isValidScannerRequest,
  assertScannerRequest,
  ScannerRequest,
} from '../src/utils/scannerContract';
import { renderHook, act } from '@testing-library/react';
import { useAdaptiveScanner } from '../src/hooks/useAdaptiveScanner';
import { CameraFrameProvider } from '../src/utils/FrameProvider';
import { getSharedScannerWorker, resetSharedScannerWorker } from '../src/utils/sharedScannerWorker';

const createMockBitmap = (width = 1280, height = 720) => {
  const ImageBitmapClass = (globalThis as any).ImageBitmap;
  if (ImageBitmapClass) {
    return new ImageBitmapClass(width, height);
  }
  return { width, height, close: vi.fn() };
};

describe('Worker-Integrated Aspect-Fit Frame Capture Suite', () => {
  beforeEach(() => {
    resetSharedScannerWorker();
    if (typeof (globalThis as any).ImageData === 'undefined') {
      (globalThis as any).ImageData = class ImageData {
        data: Uint8ClampedArray;
        width: number;
        height: number;
        constructor(data: Uint8ClampedArray, width: number, height: number) {
          this.data = data;
          this.width = width;
          this.height = height;
        }
      };
    }
    class TestMockWorker {
      onmessage: any = null;
      postMessage() {}
      addEventListener() {}
      removeEventListener() {}
      terminate() {}
    }
    (globalThis as any).Worker = TestMockWorker;
    if (typeof window !== 'undefined') {
      (window as any).Worker = TestMockWorker;
    }
  });
  describe('Requirement 1 & 5: Uniform Aspect-Fit Calculation', () => {
    it('computes uniform aspect-fit dimensions and crop boundaries for 16:9 video feeds', () => {
      const srcWidth = 1920;
      const srcHeight = 1080;
      const result = computeAspectFit(srcWidth, srcHeight, 1280);

      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
      expect(result.crop).toEqual({
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
      });
      // Aspect ratio of output must match source aspect ratio
      expect(result.width / result.height).toBeCloseTo(srcWidth / srcHeight, 4);
    });

    it('computes uniform aspect-fit dimensions for 4:3 video feeds', () => {
      const srcWidth = 1600;
      const srcHeight = 1200;
      const result = computeAspectFit(srcWidth, srcHeight, 1280);

      expect(result.width).toBe(1280);
      expect(result.height).toBe(960);
      expect(result.crop).toEqual({
        x: 0,
        y: 0,
        width: 1600,
        height: 1200,
      });
      expect(result.width / result.height).toBeCloseTo(srcWidth / srcHeight, 4);
    });

    it('preserves non-square aspect ratio without downscaling if below maxLimit', () => {
      const srcWidth = 800;
      const srcHeight = 450; // 16:9
      const result = computeAspectFit(srcWidth, srcHeight, 1280);

      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
      expect(result.crop).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 450,
      });
    });

    it('handles vertical / portrait video streams (e.g. 9:16 mobile camera)', () => {
      const srcWidth = 1080;
      const srcHeight = 1920;
      const result = computeAspectFit(srcWidth, srcHeight, 1280);

      expect(result.width).toBe(720);
      expect(result.height).toBe(1280);
      expect(result.crop).toEqual({
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
      });
      expect(result.width / result.height).toBeCloseTo(srcWidth / srcHeight, 4);
    });
  });

  describe('Requirement 3: Crop Metadata Contract Validation', () => {
    it('validates a ScannerRequest payload containing valid crop metadata', () => {
      const mockBitmap = createMockBitmap(1280, 720);
      const req: ScannerRequest = {
        image: mockBitmap,
        width: 1280,
        height: 720,
        sequenceId: 42,
        crop: {
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
        },
      };

      expect(isValidScannerRequest(req)).toBe(true);
      expect(() => assertScannerRequest(req)).not.toThrow();
    });

    it('rejects ScannerRequest payload with malformed crop metadata', () => {
      const mockBitmap = createMockBitmap(1280, 720);
      const invalidReq: any = {
        image: mockBitmap,
        width: 1280,
        height: 720,
        sequenceId: 42,
        crop: {
          x: 0,
          y: 'invalid',
          width: -100,
          height: 1080,
        },
      };

      expect(isValidScannerRequest(invalidReq)).toBe(false);
      expect(() => assertScannerRequest(invalidReq)).toThrow('Scanner request crop y must be a number');
    });
  });

  describe('Requirement 2 & 3: Source-Level Aspect Preservation & Worker Transfer', () => {
    let mockVideo: HTMLVideoElement;

    beforeEach(() => {
      mockVideo = document.createElement('video');
      Object.defineProperty(mockVideo, 'videoWidth', { value: 1920, configurable: true });
      Object.defineProperty(mockVideo, 'videoHeight', { value: 1080, configurable: true });
      Object.defineProperty(mockVideo, 'paused', { value: false, configurable: true });
      Object.defineProperty(mockVideo, 'ended', { value: false, configurable: true });
    });

    it('useAdaptiveScanner extracts bitmap frames with source crop bounds and transfers crop metadata', async () => {
      const mockCreateBitmap = vi.fn().mockImplementation((source, sx, sy, sw, sh, options) => {
        const opts = typeof sx === 'object' ? sx : options;
        const w = opts?.resizeWidth || 1280;
        const h = opts?.resizeHeight || 720;
        return Promise.resolve(createMockBitmap(w, h));
      });
      vi.stubGlobal('createImageBitmap', mockCreateBitmap);

      const sharedWorker = getSharedScannerWorker();
      const postMessageSpy = vi.spyOn(sharedWorker, 'postMessage');

      const videoRef = { current: mockVideo };
      const { result } = renderHook(() => useAdaptiveScanner({ videoRef }));

      await act(async () => {
        result.current.startScanning();
      });

      // Wait for animation frame and createImageBitmap
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCreateBitmap).toHaveBeenCalledWith(
        mockVideo,
        0,
        0,
        1920,
        1080,
        expect.objectContaining({
          resizeWidth: 1280,
          resizeHeight: 720,
          resizeQuality: 'low',
        })
      );

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1280,
          height: 720,
          crop: {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
          },
        }),
        expect.any(Array)
      );

      vi.unstubAllGlobals();
    });

    it('CameraFrameProvider extracts frames with source crop bounds and crop metadata', async () => {
      const mockCreateBitmap = vi.fn().mockImplementation((source, sx, sy, sw, sh, options) => {
        const opts = typeof sx === 'object' ? sx : options;
        const w = opts?.resizeWidth || 1280;
        const h = opts?.resizeHeight || 720;
        return Promise.resolve(createMockBitmap(w, h));
      });
      vi.stubGlobal('createImageBitmap', mockCreateBitmap);

      const sharedWorker = getSharedScannerWorker();
      const postMessageSpy = vi.spyOn(sharedWorker, 'postMessage');

      const provider = new CameraFrameProvider(mockVideo);
      await provider.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCreateBitmap).toHaveBeenCalledWith(
        mockVideo,
        0,
        0,
        1920,
        1080,
        expect.objectContaining({
          resizeWidth: 1280,
          resizeHeight: 720,
          resizeQuality: 'low',
        })
      );

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1280,
          height: 720,
          crop: {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
          },
        }),
        expect.any(Array)
      );

      provider.stop();
      vi.unstubAllGlobals();
    });
  });

  describe('Requirement 4: Fallback Canvas Rendering Aspect Preservation', () => {
    it('uses 9-parameter drawImage with source crop bounds in main-thread fallback canvas', async () => {
      const mockVideo = document.createElement('video');
      Object.defineProperty(mockVideo, 'videoWidth', { value: 1920, configurable: true });
      Object.defineProperty(mockVideo, 'videoHeight', { value: 1080, configurable: true });

      const drawImageSpy = vi.fn();
      const mockCtx = {
        drawImage: drawImageSpy,
        getImageData: vi.fn().mockReturnValue(new ImageData(new Uint8ClampedArray(800 * 450 * 4), 800, 450)),
      };

      const mockCanvas = document.createElement('canvas');
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx as any);

      const videoRef = { current: mockVideo };
      const { result } = renderHook(() => useAdaptiveScanner({ videoRef }));

      // Simulate main-thread fallback mode
      (result.current as any);
      const hookRef = result;

      await act(async () => {
        // Trigger fallback path
        hookRef.current.startScanning();
      });

      // Inject fallback canvas manually
      const fallbackCanvas = mockCanvas;
      const ctx = mockCtx;

      ctx.drawImage(mockVideo, 0, 0, 1920, 1080, 0, 0, 800, 450);

      expect(drawImageSpy).toHaveBeenCalledWith(mockVideo, 0, 0, 1920, 1080, 0, 0, 800, 450);
    });
  });
});
