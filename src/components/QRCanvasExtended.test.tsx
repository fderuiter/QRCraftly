import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRConfig } from '../types';

// Save original Image constructor
const originalImage = window.Image;

describe('QRCanvas Border Extended Features', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      roundRect: vi.fn(),
      rect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      bezierCurveTo: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 10 }),
      font: '',
      textAlign: '',
      textBaseline: '',
    };

    // Spy on getContext to return our mock context
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId) => {
      if (contextId === '2d') {
        return mockContext;
      }
      return null;
    });

    // Mock Image to simulate loading
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      complete = false;
      crossOrigin = '';
      constructor() {
        // Simulate async loading with a small delay
        setTimeout(() => {
          if (this.onload) {
            this.complete = true;
            this.onload();
          }
        }, 10);
      }
    }
    window.Image = MockImage as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.Image = originalImage;
  });

  it('renders dashed border style', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderColor: '#000000',
      borderStyle: 'dashed',
    };

    render(<QRCanvas config={config} size={100} />);

    await waitFor(() => {
      expect(mockContext.setLineDash).toHaveBeenCalled();
      expect(mockContext.strokeRect).toHaveBeenCalled();
    });
  });

  it('renders border text', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderText: 'Scan Me',
      borderTextPosition: 'bottom-center',
    };

    render(<QRCanvas config={config} size={100} />);

    await waitFor(() => {
      expect(mockContext.fillText).toHaveBeenCalledWith('Scan Me', expect.any(Number), expect.any(Number));
    });
  });

  it('renders border logo', async () => {
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderLogoUrl: 'data:image/png;base64,fake',
    };

    render(<QRCanvas config={config} size={100} />);

    // Wait for image to load and draw
    await waitFor(() => {
      expect(mockContext.drawImage).toHaveBeenCalled();
    });
  });
});
