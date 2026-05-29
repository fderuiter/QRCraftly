import { render, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle } from '../types';

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

import QRCode from 'qrcode';

describe('QRCanvas Performance Refactoring', () => {
  let mockContext: any;
  let mockModules: any;
  let originalImage: any;
  let createdImages: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    createdImages = [];

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

    // Mock getContext
    const getContextMock = vi.fn().mockImplementation(() => mockContext);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContextMock);

    // Setup basic modules (21x21)
    mockModules = {
      size: 21,
      get: vi.fn(),
    };

    (QRCode.create as unknown as Mock).mockReturnValue({
      modules: mockModules,
    });

    // Mock Image
    originalImage = window.Image;
    window.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      complete = false;
      crossOrigin = '';
      naturalHeight = 100;

      constructor() {
        createdImages.push(this);
      }
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.Image = originalImage;
  });

  const setupModules = (patternFn: (r: number, c: number) => boolean) => {
    mockModules.get.mockImplementation(patternFn);
  };

  it('renders MODERN style correctly using roundRect', async () => {
    // Activate some modules in the middle
    setupModules((r, c) => r > 8 && r < 12 && c > 8 && c < 12);

    const config = { ...DEFAULT_CONFIG, style: QRStyle.MODERN };
    render(<QRCanvas config={config} />);

    await waitFor(() => {
      // Expect roundRect to be called.
      // Note: QRCanvas uses drawRoundRect helper which might fallback to paths if roundRect is missing.
      // JSDOM canvas context might not have roundRect.
      // We mocked getContext, so mockContext DOES have roundRect spy.
      // However, drawRoundRect checks `if (ctx.roundRect)`.
      // Since our mockContext has it, it should be called.
      expect(mockContext.roundRect).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });
  });

  it('renders CIRCUIT style correctly', async () => {
    setupModules((r, c) => r > 8 && r < 12 && c > 8 && c < 12);

    const config = { ...DEFAULT_CONFIG, style: QRStyle.CIRCUIT };
    render(<QRCanvas config={config} />);

    await waitFor(() => {
      expect(mockContext.roundRect).toHaveBeenCalled();
      expect(mockContext.rect).toHaveBeenCalled();
    });
  });

  it('handles logo exclusion correctly', async () => {
    setupModules(() => true);

    const config = {
      ...DEFAULT_CONFIG,
      logoUrl: 'https://example.com/logo.png',
      logoSize: 0.2,
    };

    render(<QRCanvas config={config} />);

    await waitFor(() => {
      expect(createdImages.length).toBeGreaterThan(0);
    });

    act(() => {
      const img = createdImages[0];
      if (img && img.onload) {
        img.complete = true;
        img.onload();
      }
    });

    await waitFor(() => {
      expect(mockContext.drawImage).toHaveBeenCalled();
    });
  });

  it('renders STANDARD style using rect', async () => {
    setupModules((r, c) => r === 10 && c === 10);
    const config = { ...DEFAULT_CONFIG, style: QRStyle.STANDARD };

    render(<QRCanvas config={config} />);

    await waitFor(() => {
      expect(mockContext.rect).toHaveBeenCalled();
    });
  });
});
