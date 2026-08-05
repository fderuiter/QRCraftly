import { describe, it, expect, vi } from 'vitest';
import { renderBorder, renderBorderDecoration } from './border';
import { DEFAULT_CONFIG } from '../../constants';
import { QRConfig, QRDrawingContext } from '../../types';

describe('renderBorder', () => {
  const createMockContext = () => ({
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    setLineDash: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as QRDrawingContext);

  it('renders solid border', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderColor: '#ff0000',
      borderStyle: 'solid',
    };
    renderBorder(ctx, config, 200, 20);
    expect(ctx.fillStyle).toBe('#ff0000');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 200, 200);
  });

  it('renders dashed border', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderColor: '#ff0000',
      borderStyle: 'dashed',
      bgColor: '#ffffff',
    };
    renderBorder(ctx, config, 200, 20);
    expect(ctx.setLineDash).toHaveBeenNthCalledWith(1, [10, 10]);
    expect(ctx.setLineDash).toHaveBeenNthCalledWith(2, []);
    expect(ctx.strokeRect).toHaveBeenCalled();
  });

  it('renders dotted border', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderColor: '#ff0000',
      borderStyle: 'dotted',
      bgColor: '#ffffff',
    };
    renderBorder(ctx, config, 200, 20);
    expect(ctx.setLineDash).toHaveBeenNthCalledWith(1, [4, 4]);
    expect(ctx.setLineDash).toHaveBeenNthCalledWith(2, []);
    expect(ctx.strokeRect).toHaveBeenCalled();
  });

  it('renders double border', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderColor: '#ff0000',
      borderStyle: 'double',
      bgColor: '#ffffff',
    };
    renderBorder(ctx, config, 200, 20);
    expect(ctx.strokeStyle).toBe('#ffffff');
    expect(ctx.lineWidth).toBe(3);
    expect(ctx.strokeRect).toHaveBeenCalled();
  });
});

describe('renderBorderDecoration', () => {
  const createMockContext = () => ({
    fillText: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as QRDrawingContext);

  it('does nothing if no decoration config', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderText: '',
      borderLogoUrl: '',
    };
    renderBorderDecoration(ctx, config, 200, 20, null);
    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('renders border text at top-center', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderText: 'My QR Code',
      borderTextColor: '#00ff00',
      borderTextPosition: 'top-center',
    };
    renderBorderDecoration(ctx, config, 200, 20, null);
    expect(ctx.fillStyle).toBe('#00ff00');
    expect(ctx.fillText).toHaveBeenCalledWith('My QR Code', 100, 10);
  });

  it('renders border text at bottom-center', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderText: 'My QR Code',
      borderTextColor: '#00ff00',
      borderTextPosition: 'bottom-center',
    };
    renderBorderDecoration(ctx, config, 200, 20, null);
    expect(ctx.fillStyle).toBe('#00ff00');
    expect(ctx.fillText).toHaveBeenCalledWith('My QR Code', 100, 190);
  });

  it('renders border logo at bottom-center', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderLogoUrl: 'logo.png',
      borderLogoPosition: 'bottom-center',
    };
    const mockImg = {} as HTMLImageElement;
    renderBorderDecoration(ctx, config, 200, 20, mockImg);
    expect(ctx.drawImage).toHaveBeenCalledWith(mockImg, 92, 182, 16, 16);
  });

  it('renders border logo at bottom-right', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderLogoUrl: 'logo.png',
      borderLogoPosition: 'bottom-right',
    };
    const mockImg = {} as HTMLImageElement;
    renderBorderDecoration(ctx, config, 200, 20, mockImg);
    expect(ctx.drawImage).toHaveBeenCalledWith(mockImg, 164, 182, 16, 16);
  });

  it('renders border text with unsupported position (implicit else / false condition)', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderText: 'My QR Code',
      borderTextColor: '#00ff00',
      borderTextPosition: 'top-left' as any, // unexpected/unhandled text position to test false condition
    };
    renderBorderDecoration(ctx, config, 200, 20, null);
    // Should still set options but default ty = borderPx / 2
    expect(ctx.fillStyle).toBe('#00ff00');
    expect(ctx.fillText).toHaveBeenCalledWith('My QR Code', 100, 10);
  });

  it('renders border logo with unsupported position (implicit else / false condition)', () => {
    const ctx = createMockContext();
    const config: QRConfig = {
      ...DEFAULT_CONFIG,
      borderLogoUrl: 'logo.png',
      borderLogoPosition: 'top-left' as any, // unexpected/unhandled logo position to test false condition
    };
    const mockImg = {} as HTMLImageElement;
    renderBorderDecoration(ctx, config, 200, 20, mockImg);
    // Defaults to the initial values of blx/bly computed before bottom-center check
    expect(ctx.drawImage).toHaveBeenCalledWith(mockImg, 92, 182, 16, 16);
  });
});
