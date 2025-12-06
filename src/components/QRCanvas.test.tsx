
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
    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.rect).toHaveBeenCalled();
    expect(mockContext.fill).toHaveBeenCalled();
  });

  it('renders different styles correctly (DOTS)', async () => {
    const config = { ...DEFAULT_CONFIG, style: QRStyle.DOTS };
    render(<QRCanvas config={config} />);

    await waitFor(() => {
         expect(QRCode.default.create).toHaveBeenCalled();
    });

    // For eyes in DOTS style, it uses roundRect
    // Wait for roundRect to be called.
    await waitFor(() => {
        expect(mockContext.roundRect).toHaveBeenCalled();
    });
  });

  it('draws dots for data modules when style is DOTS', async () => {
     mockModules.get.mockImplementation((r: number, c: number) => {
        if (r === 10 && c === 10) return true; // Data module
        return false;
     });
     
     const config = { ...DEFAULT_CONFIG, style: QRStyle.DOTS };
     render(<QRCanvas config={config} />);
     
     await waitFor(() => {
        expect(mockContext.arc).toHaveBeenCalled();
     });
  });

  it('draws rounded rects for data modules when style is ROUNDED', async () => {
     mockModules.get.mockImplementation((r: number, c: number) => {
        if (r === 10 && c === 10) return true; 
        return false;
     });
     
     const config = { ...DEFAULT_CONFIG, style: QRStyle.ROUNDED };
     render(<QRCanvas config={config} />);
     
     await waitFor(() => {
        expect(mockContext.roundRect).toHaveBeenCalled();
     });
  });

  it('draws diamonds for data modules when style is DIAMOND', async () => {
     mockModules.get.mockImplementation((r: number, c: number) => {
        if (r === 10 && c === 10) return true;
        return false;
     });
     
     const config = { ...DEFAULT_CONFIG, style: QRStyle.DIAMOND };
     render(<QRCanvas config={config} />);
     
     await waitFor(() => {
        expect(mockContext.rotate).toHaveBeenCalled();
        expect(mockContext.rect).toHaveBeenCalled();
     });
  });

  it('draws cross for data modules when style is CROSS', async () => {
      mockModules.get.mockImplementation((r: number, c: number) => {
          if (r === 10 && c === 10) return true;
          return false;
      });

      const config = { ...DEFAULT_CONFIG, style: QRStyle.CROSS };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Cross draws two rects
          expect(mockContext.rect).toHaveBeenCalled();
      });
  });

  it('draws star for data modules when style is STAR', async () => {
      mockModules.get.mockImplementation((r: number, c: number) => {
          if (r === 10 && c === 10) return true;
          return false;
      });

      const config = { ...DEFAULT_CONFIG, style: QRStyle.STAR };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Star uses lineTo
          expect(mockContext.lineTo).toHaveBeenCalled();
          expect(mockContext.closePath).toHaveBeenCalled();
      });
  });

  it('draws heart for data modules when style is HEART', async () => {
      mockModules.get.mockImplementation((r: number, c: number) => {
          if (r === 10 && c === 10) return true;
          return false;
      });

      const config = { ...DEFAULT_CONFIG, style: QRStyle.HEART };
      render(<QRCanvas config={config} />);

      await waitFor(() => {
          // Heart uses bezierCurveTo
          expect(mockContext.bezierCurveTo).toHaveBeenCalled();
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
      expect(mockContext.fillRect).not.toHaveBeenCalled();
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
          // But modules should still be drawn (fillRect/rect from earlier)
          expect(mockContext.fill).toHaveBeenCalled();
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
});
