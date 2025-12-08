
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import QRCanvas from './QRCanvas';
import { DEFAULT_CONFIG } from '../constants';
import { QRConfig } from '../types';

describe('QRCanvas Border Extended Features', () => {
  const mockContext = {
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

  const setupCanvasMock = (originalCreateElement: any) => {
    const canvas = originalCreateElement.call(document, 'canvas');
    canvas.getContext = vi.fn().mockReturnValue(mockContext);
    return canvas;
  };

  it('renders dashed border style', async () => {
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName) => {
        if (tagName === 'canvas') return setupCanvasMock(originalCreateElement);
        return originalCreateElement.call(document, tagName);
    }) as any;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderColor: '#000000',
      borderStyle: 'dashed',
    };

    render(<QRCanvas config={config} size={100} />);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockContext.setLineDash).toHaveBeenCalled();
    expect(mockContext.strokeRect).toHaveBeenCalled();

    document.createElement = originalCreateElement;
  });

  it('renders border text', async () => {
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName) => {
        if (tagName === 'canvas') return setupCanvasMock(originalCreateElement);
        return originalCreateElement.call(document, tagName);
    }) as any;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderText: 'Scan Me',
      borderTextPosition: 'bottom-center',
    };

    render(<QRCanvas config={config} size={100} />);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockContext.fillText).toHaveBeenCalledWith('Scan Me', expect.any(Number), expect.any(Number));

    document.createElement = originalCreateElement;
  });

  it('renders border logo', async () => {
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName) => {
        if (tagName === 'canvas') return setupCanvasMock(originalCreateElement);
        return originalCreateElement.call(document, tagName);
    }) as any;

    // Mock Image
    const originalImage = window.Image;
    window.Image = class {
      onload: any;
      src: string = '';
      crossOrigin: string = '';
      complete: boolean = true; // Simulate instant load
      constructor() {
        setTimeout(() => this.onload && this.onload(), 10);
      }
    } as any;

    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      isBorderEnabled: true,
      borderSize: 0.1,
      borderLogoUrl: 'data:image/png;base64,fake',
    };

    render(<QRCanvas config={config} size={100} />);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // drawImage called twice? Once for main QR (if any) and one for border.
    // Default config has no logoUrl, but has borderLogoUrl.
    // So drawImage should be called once.
    expect(mockContext.drawImage).toHaveBeenCalled();

    window.Image = originalImage;
    document.createElement = originalCreateElement;
  });
});
