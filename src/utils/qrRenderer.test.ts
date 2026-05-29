import { vi, describe, it, expect, beforeEach } from 'vitest';
import { drawQR } from './qrRenderer';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';

describe('drawQR', () => {
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
      setLineDash: vi.fn(),
      strokeRect: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      quadraticCurveTo: vi.fn(), // Needed for fallback
    };

    mockModules = {
      size: 21,
      get: vi.fn().mockReturnValue(false),
    };
  });

  it('draws background and modules', () => {
    mockModules.get.mockImplementation((r: number, c: number) => {
      return r === 10 && c === 10;
    });

    drawQR(mockContext, mockModules, DEFAULT_CONFIG, null, null, 100);

    expect(mockContext.clearRect).toHaveBeenCalled();
    // At least background and eyes are drawn
    expect(mockContext.fillRect).toHaveBeenCalled();
  });

  it('draws rounded rects for MODERN style', () => {
    mockModules.get.mockImplementation((r: number, c: number) => {
      return r === 10 && c === 10;
    });

    const config = { ...DEFAULT_CONFIG, style: QRStyle.MODERN };
    drawQR(mockContext, mockModules, config, null, null, 100);

    // Modern uses roundedRect (or shim which uses quadraticCurveTo)
    // Since we mock roundRect, it should be called if drawRoundRect uses it.
    // drawRoundRect checks `if (ctx.roundRect)`. Our mock has it.
    expect(mockContext.roundRect).toHaveBeenCalled();
  });

  it('draws circles for SWISS style', () => {
    mockModules.get.mockImplementation((r: number, c: number) => {
      return r === 10 && c === 10;
    });

    const config = { ...DEFAULT_CONFIG, style: QRStyle.SWISS };
    drawQR(mockContext, mockModules, config, null, null, 100);

    // SWISS uses arc for modules and eyes
    expect(mockContext.arc).toHaveBeenCalled();
  });

  it('draws logo when provided', () => {
    const logoImg = { width: 100, height: 100 } as HTMLImageElement;
    drawQR(mockContext, mockModules, { ...DEFAULT_CONFIG, logoUrl: 'test' }, logoImg, null, 100);

    expect(mockContext.drawImage).toHaveBeenCalledWith(
      logoImg,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('draws border when enabled', () => {
    const config = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderColor: '#ff0000',
    };
    drawQR(mockContext, mockModules, config, null, null, 100);

    // Border background
    expect(mockContext.fillRect).toHaveBeenCalled();
    // Since it's solid border, it's just fillRect calls (border bg, then qr bg)
    // We can check fillStyle changes
    // This is a bit loose but sufficient for basic coverage
    expect(mockContext.fillStyle).toBe(config.fgColor); // Ends with fgColor for modules
  });

  it('draws dashed border', () => {
    const config = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderStyle: 'dashed' as const,
    };
    drawQR(mockContext, mockModules, config, null, null, 100);

    expect(mockContext.setLineDash).toHaveBeenCalled();
    expect(mockContext.strokeRect).toHaveBeenCalled();
  });
});
