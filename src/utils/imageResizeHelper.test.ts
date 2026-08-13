// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isLowTierDevice,
  isOffThreadSupported,
  processImageOnMainThread
} from './imageResizeHelper';

describe('imageResizeHelper', () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;

  afterEach(() => {
    vi.restoreAllMocks();
    global.navigator = originalNavigator;
    global.window = originalWindow;
  });

  describe('isLowTierDevice', () => {
    it('returns true if hardwareConcurrency < 4', () => {
      Object.defineProperty(global, 'navigator', {
        value: { hardwareConcurrency: 2 },
        writable: true,
        configurable: true
      });
      expect(isLowTierDevice()).toBe(true);
    });

    it('returns true if deviceMemory < 4', () => {
      Object.defineProperty(global, 'navigator', {
        value: { hardwareConcurrency: 8, deviceMemory: 2 },
        writable: true,
        configurable: true
      });
      expect(isLowTierDevice()).toBe(true);
    });

    it('returns false if device has high specs', () => {
      Object.defineProperty(global, 'navigator', {
        value: { hardwareConcurrency: 8, deviceMemory: 8 },
        writable: true,
        configurable: true
      });
      expect(isLowTierDevice()).toBe(false);
    });
  });

  describe('isOffThreadSupported', () => {
    it('returns true if Worker, OffscreenCanvas, and createImageBitmap are in window', () => {
      Object.defineProperty(global, 'window', {
        value: {
          Worker: class {},
          OffscreenCanvas: class {},
          createImageBitmap: () => {}
        },
        writable: true,
        configurable: true
      });
      expect(isOffThreadSupported()).toBe(true);
    });

    it('returns false if Worker is missing', () => {
      Object.defineProperty(global, 'window', {
        value: {
          OffscreenCanvas: class {},
          createImageBitmap: () => {}
        },
        writable: true,
        configurable: true
      });
      expect(isOffThreadSupported()).toBe(false);
    });
  });

  describe('processImageOnMainThread', () => {
    it('successfully processes an image and outputs optimized dataUrl', async () => {
      // Mock global URL methods
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      // Mock Image constructor
      const mockImage = {
        naturalWidth: 2000,
        naturalHeight: 1000,
        onload: null as any,
        onerror: null as any,
        src: ''
      };
      
      const originalImage = global.Image;
      global.Image = vi.fn().mockImplementation(function (this: any) {
        // Automatically trigger onload on src set
        setTimeout(() => {
          if (mockImage.onload) mockImage.onload();
        }, 0);
        return mockImage;
      }) as any;

      // Mock HTMLCanvasElement
      const mockToDataURL = vi.fn().mockReturnValue('data:image/webp;base64,mockWebP');
      const mockCtx = {
        drawImage: vi.fn(),
        clearRect: vi.fn()
      };
      const mockCanvas = {
        getContext: () => mockCtx,
        toDataURL: mockToDataURL,
        width: 0,
        height: 0
      };

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas as any;
        }
        return {} as any;
      });

      const file = new Blob(['dummy content'], { type: 'image/png' });
      const result = await processImageOnMainThread(file, 1000);

      expect(createObjectURLMock).toHaveBeenCalledWith(file);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
      expect(mockCanvas.width).toBe(1000);
      expect(mockCanvas.height).toBe(500);
      expect(mockCtx.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 1000, 500);
      expect(mockToDataURL).toHaveBeenCalledWith('image/webp', 0.8);
      expect(result).toBe('data:image/webp;base64,mockWebP');

      global.Image = originalImage;
    });
  });
});
