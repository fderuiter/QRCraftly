
import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';
import * as QRCode from 'qrcode';

// Mock qrcode module
vi.mock('qrcode', () => ({
  default: {
    create: vi.fn(),
  },
}));

// Mock Image
const originalImage = window.Image;

describe('QRCanvas Rendering Logic Extended', () => {
  let mockContext: any;
  let mockModules: any;

  beforeEach(() => {
    vi.clearAllMocks(); // Clear call history

    // Setup Mock Canvas Context
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
      quadraticCurveTo: vi.fn(), // For manual roundRect
      setLineDash: vi.fn(),
      strokeRect: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
    };

    // Mock getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
      if (contextId === '2d') {
        return mockContext;
      }
      return null;
    });

    // Setup Mock QRCode Data
    const size = 21;
    mockModules = {
      size: size,
      get: vi.fn().mockReturnValue(false),
    };

    (QRCode.default.create as unknown as Mock).mockReturnValue({
      modules: mockModules,
    });

    // Mock Image
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

  // Helper to trigger specific module state
  const setModule = (r: number, c: number, val: boolean) => {
      mockModules.get.mockImplementation((row: number, col: number) => {
          if (row === r && col === c) return val;
          return false;
      });
  };

  it('draws FLUID style correctly (using arc)', async () => {
      setModule(10, 10, true);
      const config = { ...DEFAULT_CONFIG, style: QRStyle.FLUID };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(mockContext.arc).toHaveBeenCalled();
          expect(mockContext.fill).toHaveBeenCalled();
      });
  });

  it('draws GRUNGE style correctly (using rough rect / rotation)', async () => {
      setModule(10, 10, true);
      const config = { ...DEFAULT_CONFIG, style: QRStyle.GRUNGE };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(mockContext.save).toHaveBeenCalled();
          expect(mockContext.rotate).toHaveBeenCalled();
          expect(mockContext.restore).toHaveBeenCalled();
          expect(mockContext.fillRect).toHaveBeenCalled();
      });
  });

  it('draws CIRCUIT style correctly (full square + notches)', async () => {
      setModule(10, 10, true);
      const config = { ...DEFAULT_CONFIG, style: QRStyle.CIRCUIT };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Should use roundRect for the main body
          expect(mockContext.roundRect).toHaveBeenCalled();
          expect(mockContext.fill).toHaveBeenCalled();
          // And potentially fillRect for connections (though none here)
      });
  });

  it('draws Border DOTTED style', async () => {
      const config = { ...DEFAULT_CONFIG, isBorderEnabled: true, borderStyle: 'dotted' as const, borderSize: 0.1 };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(mockContext.setLineDash).toHaveBeenCalledWith(expect.arrayContaining([expect.any(Number), expect.any(Number)]));
          expect(mockContext.strokeRect).toHaveBeenCalled();
      });
  });

  it('draws Border DOUBLE style', async () => {
      const config = { ...DEFAULT_CONFIG, isBorderEnabled: true, borderStyle: 'double' as const, borderSize: 0.1 };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Double style just draws a strokeRect with offset
          expect(mockContext.strokeRect).toHaveBeenCalled();
          // It doesn't use setLineDash
          expect(mockContext.setLineDash).not.toHaveBeenCalledWith(expect.any(Array));
      });
  });

  it('draws Border Text Top Center', async () => {
      const config = { ...DEFAULT_CONFIG, isBorderEnabled: true, borderText: 'TEST', borderTextPosition: 'top-center' as const };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(mockContext.fillText).toHaveBeenCalledWith('TEST', expect.any(Number), expect.any(Number));
          // Verify Y position is small (near top)
          const call = mockContext.fillText.mock.calls[0];
          expect(call[2]).toBeLessThan(1024 / 2); // y < half height
      });
  });

  it('uses manual drawRoundRect fallback if ctx.roundRect is missing', async () => {
      // Delete roundRect from mock
      mockContext.roundRect = undefined;

      setModule(10, 10, true);
      const config = { ...DEFAULT_CONFIG, style: QRStyle.MODERN }; // Modern uses roundRect
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(mockContext.quadraticCurveTo).toHaveBeenCalled();
          expect(mockContext.moveTo).toHaveBeenCalled();
          expect(mockContext.lineTo).toHaveBeenCalled();
          expect(mockContext.closePath).toHaveBeenCalled();
      });
  });

  it('draws different eye patterns correctly', async () => {
     // We just want to ensure specific calls happen for eyes.
     // Eyes are drawn at (0,0), (0, 14), (14, 0) relative to modules... wait size is 21.
     // Eyes are top-left, top-right, bottom-left.

     // Check FLUID Eye
     const fluidConfig = { ...DEFAULT_CONFIG, style: QRStyle.FLUID };
     render(<QRCanvas config={fluidConfig} />);
     await waitFor(() => {
         // Fluid eye uses drawRoundRect for frame and arc for pupil
         expect(mockContext.roundRect).toHaveBeenCalled();
         expect(mockContext.arc).toHaveBeenCalled();
     });

     // Reset mocks
     vi.clearAllMocks();

     // Check STARBURST Eye
     const starConfig = { ...DEFAULT_CONFIG, style: QRStyle.STARBURST };
     render(<QRCanvas config={starConfig} />);
     await waitFor(() => {
         // Starburst uses fillRect for frame (square) and drawStar for pupil
         // drawStar uses many lineTo calls
         expect(mockContext.lineTo).toHaveBeenCalled();
     });

     // Reset mocks
     vi.clearAllMocks();

     // Check GRUNGE Eye
     const grungeConfig = { ...DEFAULT_CONFIG, style: QRStyle.GRUNGE };
     render(<QRCanvas config={grungeConfig} />);
     await waitFor(() => {
         // Grunge uses drawRoughRect (rotate) and drawScribble (rotate + loop)
         expect(mockContext.rotate).toHaveBeenCalled();
     });
  });
});
