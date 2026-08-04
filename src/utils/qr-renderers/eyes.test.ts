import { describe, it, expect, vi } from 'vitest';
import { renderEyes } from './eyes';
import { QRStyle } from '../../types';

describe('renderEyes', () => {
  const createMockCtx = () => {
    return {
      beginPath: vi.fn(),
      rect: vi.fn(),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      ellipse: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
    } as unknown as CanvasRenderingContext2D;
  };

  const baseConfig = {
    value: 'test',
    type: 'URL' as any,
    style: QRStyle.STANDARD,
    eyeColor: '#000000',
    bgColor: '#ffffff',
    fgColor: '#000000',
    logoImage: undefined,
    logoPaddingStyle: 'NONE' as any,
  } as any;

  it('renders standard eyes by default', () => {
    const ctx = createMockCtx();
    renderEyes(ctx, { ...baseConfig, style: QRStyle.STANDARD }, 0, 0, 10, 21);

    // Standard eye draws fillRect, clearShape (restores fillStyle)
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.clearRect).not.toHaveBeenCalled();
  });

  it('renders modern eyes', () => {
    const ctx = createMockCtx();
    renderEyes(ctx, { ...baseConfig, style: QRStyle.MODERN }, 0, 0, 10, 21);

    // Modern eye draws rounded eye frame and rounded eyeball
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('renders fluid/swiss dot eyes', () => {
    const ctx = createMockCtx();
    renderEyes(ctx, { ...baseConfig, style: QRStyle.FLUID }, 0, 0, 10, 21);

    // Fluid eye draws rounded eye frame and arc for floating circular eyeball
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('renders circuit eyes with cuts and notched square eyeball', () => {
    const ctx = createMockCtx();
    renderEyes(ctx, { ...baseConfig, style: QRStyle.CIRCUIT }, 0, 0, 10, 21);

    // Circuit eye draws cuts with bgColor and notched eyeball
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.rect).toHaveBeenCalled();
  });

  it('renders hive eyes with hexagonal eyeball', () => {
    const ctx = createMockCtx();
    renderEyes(ctx, { ...baseConfig, style: QRStyle.HIVE }, 0, 0, 10, 21);

    // Hive eyeball draws a polygon with 6 sides
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it('renders grunge eyes with rough rect frame and scribble eyeball', () => {
    const ctx = createMockCtx();
    renderEyes(ctx, { ...baseConfig, style: QRStyle.GRUNGE }, 0, 0, 10, 21);

    // Grunge draws rough shapes and scribbles
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('renders starburst eyes with star-shaped eyeball', () => {
    const ctx = createMockCtx();
    renderEyes(ctx, { ...baseConfig, style: QRStyle.STARBURST }, 0, 0, 10, 21);

    // Starburst eyeball draws a star polygon
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('falls back to default standard style for unhandled styles', () => {
    const ctx = createMockCtx();
    renderEyes(ctx, { ...baseConfig, style: 'INVALID_STYLE' as any }, 0, 0, 10, 21);

    // Falls back to standard style
    expect(ctx.clearRect).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
