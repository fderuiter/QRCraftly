import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';
import QRCode from 'qrcode';

// Mock qrcode module
vi.mock('qrcode', () => {
  const createMock = vi.fn();
  return {
    create: createMock,
    default: {
      create: createMock,
    },
  };
});

// Mock Image
const originalImage = window.Image;

describe('QRCanvas Batch Rendering', () => {
  let mockContext: any;
  let mockModules: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      roundRect: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      quadraticCurveTo: vi.fn(),
      setLineDash: vi.fn(),
      strokeRect: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockContext);

    // 21x21 modules
    mockModules = {
      size: 21,
      get: vi.fn().mockReturnValue(false),
    };

    (QRCode.create as unknown as Mock).mockReturnValue({
      modules: mockModules,
    });

    window.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      complete = false;
      crossOrigin = '';
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.Image = originalImage;
  });

  const setModulesPattern = () => {
      // Set a few modules to true to trigger drawing
      mockModules.get.mockImplementation((r: number, c: number) => {
          // Activate a block of modules (6x6 = 36 modules)
          // Avoid eyes (0-7, 0-7 etc)
          if (r > 8 && r < 15 && c > 8 && c < 15) return true;
          return false;
      });
  };

  it('batches HIVE style (drawPoly) calls', async () => {
      setModulesPattern();
      const config = { ...DEFAULT_CONFIG, style: QRStyle.HIVE };
      render(<QRCanvas config={config} />);

      // Wait for drawing to happen
      await waitFor(() => {
          expect(mockContext.fill).toHaveBeenCalled();
      });

      const fillCallCount = mockContext.fill.mock.calls.length;

      // With optimization: fill should be called once for background + once for modules batch + 3 eyes = ~5
      // Without optimization: fill called for every module (36) + eyes + background = >40
      expect(fillCallCount).toBeLessThan(10);
  });

  it('batches STARBURST style (drawStar) calls', async () => {
      setModulesPattern();
      const config = { ...DEFAULT_CONFIG, style: QRStyle.STARBURST };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(mockContext.fill).toHaveBeenCalled();
      });

      const fillCallCount = mockContext.fill.mock.calls.length;
      expect(fillCallCount).toBeLessThan(10);
  });

  it('batches GRUNGE style (drawRoughRect) calls', async () => {
      setModulesPattern();
      const config = { ...DEFAULT_CONFIG, style: QRStyle.GRUNGE };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
        // Wait for rendering to start.
        // In unoptimized mode, fillRect is called.
        // In optimized mode, fill is called.
        // So we wait for clearRect which means render cycle started,
        // but we need to wait for actual drawing commands.
        // Let's wait for fillRect (background uses it)
        expect(mockContext.fillRect).toHaveBeenCalled();
      });

      // Allow some time for module loop to finish if it's async/heavy?
      // No, it's synchronous inside useEffect.

      const fillRectCount = mockContext.fillRect.mock.calls.length;

      // With optimization: fillRect only used for eyes (frames + holes) + background = ~4-10
      // Modules use rect().
      // Without optimization: fillRect called for every module (36) + eyes + background = >40
      expect(fillRectCount).toBeLessThan(20);

      // And we expect fill() to be called for the modules batch (if optimized)
      // If unoptimized, fill() is NOT called for modules (only background if border enabled? No default border is disabled).
      // Wait, background uses fillRect.
      expect(mockContext.fill).toHaveBeenCalled();
  });
});
