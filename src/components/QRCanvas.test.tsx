
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRStyle, LogoPaddingStyle } from '../types';
import * as QRCode from 'qrcode';

// Mock qrcode module
vi.mock('qrcode', () => ({
  default: {
    create: vi.fn(),
  },
}));

// Mock Image
const originalImage = window.Image;

describe('QRCanvas Component', () => {
  let mockContext: any;
  let mockModules: any;
  let createdImages: any[];

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
      bezierCurveTo: vi.fn(),
      canvas: { width: 0, height: 0 },
      fillStyle: '',
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
    
    // Default mock implementation for get
    mockModules.get.mockImplementation((r: number, c: number) => {
        if (r === 0 && c === 0) return true;
        return false;
    });

    (QRCode.default.create as unknown as Mock).mockReturnValue({
      modules: mockModules,
    });

    // Mock Image
    createdImages = [];
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      complete = false;
      crossOrigin = '';
      constructor() {
        createdImages.push(this);
      }
    }
    window.Image = MockImage as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.Image = originalImage;
  });

  it('renders correctly with default config', async () => {
    render(<QRCanvas config={DEFAULT_CONFIG} />);

    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('QR Code for Url'));

    await waitFor(() => {
        expect(QRCode.default.create).toHaveBeenCalledWith(DEFAULT_CONFIG.value, { errorCorrectionLevel: 'H' });
    });

    expect(mockContext.clearRect).toHaveBeenCalled();
    expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);
    
    // Check drawing
    // expect(mockContext.beginPath).toHaveBeenCalled(); // STANDARD uses fillRect mainly
    expect(mockContext.fillRect).toHaveBeenCalled();
  });

  it('renders different styles correctly (SWISS)', async () => {
    const config = { ...DEFAULT_CONFIG, style: QRStyle.SWISS };
    render(<QRCanvas config={config} />);

    await waitFor(() => {
         expect(QRCode.default.create).toHaveBeenCalled();
    });

    // SWISS uses arc for modules and eyes
    await waitFor(() => {
        expect(mockContext.arc).toHaveBeenCalled();
    });
  });

  it('draws rounded rects for data modules when style is MODERN', async () => {
     mockModules.get.mockImplementation((r: number, c: number) => {
        if (r === 10 && c === 10) return true; 
        return false;
     });
     
     const config = { ...DEFAULT_CONFIG, style: QRStyle.MODERN };
     render(<QRCanvas config={config} />);
     
     await waitFor(() => {
        // Modern uses roundedRect (or shim)
        expect(mockContext.roundRect).toHaveBeenCalled();
     });
  });

  it('draws star for data modules when style is STARBURST', async () => {
      mockModules.get.mockImplementation((r: number, c: number) => {
          if (r === 10 && c === 10) return true;
          return false;
      });

      const config = { ...DEFAULT_CONFIG, style: QRStyle.STARBURST };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Star uses lineTo loop
          expect(mockContext.lineTo).toHaveBeenCalled();
          expect(mockContext.closePath).toHaveBeenCalled();
      });
  });

  it('draws hexagon for HIVE style', async () => {
      mockModules.get.mockImplementation((r: number, c: number) => {
          if (r === 10 && c === 10) return true;
          return false;
      });

      const config = { ...DEFAULT_CONFIG, style: QRStyle.HIVE };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
         // Hexagon loop 6 times
         expect(mockContext.lineTo).toHaveBeenCalled();
      });
  });

  it('handles logo rendering', async () => {
    const config = { ...DEFAULT_CONFIG, logoUrl: 'https://example.com/logo.png' };
    
    render(<QRCanvas config={config} />);

    // Wait for image to be created
    await waitFor(() => {
        expect(createdImages.length).toBeGreaterThan(0);
    });

    const img = createdImages[0];
    
    // Simulate load
    if (img.onload) {
        img.complete = true;
        img.onload();
    }

    await waitFor(() => {
        expect(mockContext.drawImage).toHaveBeenCalled();
    });
  });

  it('renders logo with circle padding', async () => {
      const config = {
          ...DEFAULT_CONFIG,
          logoUrl: 'https://example.com/logo.png',
          logoPaddingStyle: 'circle' as LogoPaddingStyle
      };

      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(createdImages.length).toBeGreaterThan(0);
      });
      const img = createdImages[0];
      if (img.onload) { img.complete = true; img.onload(); }

      await waitFor(() => {
          // Should draw a circle background (arc)
          expect(mockContext.arc).toHaveBeenCalled();
          expect(mockContext.drawImage).toHaveBeenCalled();
      });
  });

  it('renders logo with square padding', async () => {
      const config = {
          ...DEFAULT_CONFIG,
          logoUrl: 'https://example.com/logo.png',
          logoPaddingStyle: 'square' as LogoPaddingStyle
      };

      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(createdImages.length).toBeGreaterThan(0);
      });
      const img = createdImages[0];
      if (img.onload) { img.complete = true; img.onload(); }

      await waitFor(() => {
          // Should draw a rect background
          expect(mockContext.fillRect).toHaveBeenCalled();
          expect(mockContext.drawImage).toHaveBeenCalled();
      });
  });

  it('does not draw logo background when padding style is none', async () => {
      const config = {
          ...DEFAULT_CONFIG,
          logoUrl: 'https://example.com/logo.png',
          logoPaddingStyle: 'none' as LogoPaddingStyle
      };

      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(createdImages.length).toBeGreaterThan(0);
      });
      const img = createdImages[0];
      if (img.onload) { img.complete = true; img.onload(); }

      // Reset mock to check for subsequent calls
      mockContext.fillRect.mockClear();
      mockContext.arc.mockClear();

      await waitFor(() => {
          expect(mockContext.drawImage).toHaveBeenCalled();
      });

      // Should NOT draw background for logo
      // Since we optimized rendering to do a full redraw on image load, we expect main background calls.
      // But we shouldn't see a "logo padding" call.
      // Standard QR: 1 bg + 1 module (0,0) + 3 eyes (2 fillRects each) = 8 calls?
      // Wait, eyes have fillRect (frame), clearShape, fillRect (hole), fillRect (eyeball)?
      // Standard Eye: fillRect (frame), clearShape -> clearRect, fillRect (hole), fillRect (eyeball).
      // So 3 fillRects per eye.
      // 3 * 3 = 9.
      // Background = 1.
      // Total 10.
      expect(mockContext.fillRect).toHaveBeenCalledTimes(10);
      expect(mockContext.arc).not.toHaveBeenCalled();
  });

  it('handles logo loading error', async () => {
      const config = { ...DEFAULT_CONFIG, logoUrl: 'https://example.com/bad-logo.png' };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          expect(createdImages.length).toBeGreaterThan(0);
      });
      const img = createdImages[0];

      // Simulate error
      if (img.onerror) {
          img.onerror();
      }

      // Should still finish rendering but without logo
      await waitFor(() => {
          // drawImage should NOT be called for the logo
          expect(mockContext.drawImage).not.toHaveBeenCalled();

          // Data modules are drawn using various context methods depending on style.
          // In standard mode, we might expect fillRect or rect.
          // Or at least, fill should be called for eye rendering or modules.
          // BUT, if mockModules.get returns false (except 0,0), we might not see many calls.
          // Let's just check that fillRect was called (for background)
          expect(mockContext.fillRect).toHaveBeenCalled();
      });
  });

  it('handles QR generation failure', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Make QRCode.create throw
      (QRCode.default.create as unknown as Mock).mockImplementationOnce(() => {
          throw new Error('Generation failed');
      });

      render(<QRCanvas config={DEFAULT_CONFIG} />);

      await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith("QR generation failed:", expect.any(Error));
      });

      consoleSpy.mockRestore();
  });

  it('does not render if value is empty', async () => {
    const config = { ...DEFAULT_CONFIG, value: '' };
    render(<QRCanvas config={config} />);
    
    await waitFor(() => {
       expect(mockContext.clearRect).toHaveBeenCalled();
    });
    
    expect(QRCode.default.create).not.toHaveBeenCalled();
  });

  it('should ensure the logo cutout does not exceed safe error correction limits', async () => {
    // Setup a scenario where user config would break the QR code
    // Version 3 (29x29)
    // Logo Size 0.35
    // Padding 4 modules

    // We mock the modules size to be small to exaggerate the issue
    const moduleCount = 29;
    mockModules.size = moduleCount;

    const dangerousConfig = {
      ...DEFAULT_CONFIG,
      value: 'https://example.com',
      logoUrl: 'https://example.com/logo.png', // valid url to trigger image loading
      logoSize: 0.35,
      logoPaddingStyle: 'square' as LogoPaddingStyle,
      logoPadding: 4,
    };

    render(<QRCanvas config={dangerousConfig} size={100} />);

    await waitFor(() => {
        expect(createdImages.length).toBeGreaterThan(0);
    });

    const img = createdImages[0];
    if (img.onload) { img.complete = true; img.onload(); }

    await waitFor(() => {
        // Find the logo background call. It should be the one centered.
        // displaySize 100. Center 50.
        const fillRectCalls = mockContext.fillRect.mock.calls;
        const logoBgCall = fillRectCalls.find((args: any[]) => {
            const [x, y, w, h] = args;
            // Check if it's roughly square and centered
            return Math.abs(w - h) < 0.1 && w > 20 && w < 90 && Math.abs(x - (100-w)/2) < 2;
        });

        expect(logoBgCall).toBeDefined();
        const drawnWidth = logoBgCall[2];
        const relativeWidth = drawnWidth / 100;

        // This assertion ensures the fix is working
        // We want the relative width to be <= 0.50 (SAFE_AREA_RATIO) + buffer
        expect(relativeWidth).toBeLessThanOrEqual(0.51);
    });
  });
});
