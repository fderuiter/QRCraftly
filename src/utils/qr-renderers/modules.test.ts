import { describe, it, expect, vi } from 'vitest';
import { renderModules } from './modules';
import { QRStyle } from '../../types';

describe('renderModules', () => {
  const createMockCtx = () => {
    return {
      beginPath: vi.fn(),
      rect: vi.fn(),
      fillRect: vi.fn(),
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
    } as unknown as CanvasRenderingContext2D;
  };

  const createMockModules = (moduleCount: number, activeCoords: [number, number][]) => {
    const grid = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(false));
    activeCoords.forEach(([r, c]) => {
      if (r >= 0 && r < moduleCount && c >= 0 && c < moduleCount) {
        grid[r][c] = true;
      }
    });
    return {
      get: (r: number, c: number) => grid[r]?.[c] ?? false,
      size: moduleCount,
    } as any;
  };

  const baseConfig = {
    style: QRStyle.STANDARD,
    fgColor: '#000000',
    bgColor: '#ffffff',
    logoUrl: '',
    logoSize: 0.2,
    logoPadding: 1,
    logoPaddingStyle: 'square',
    errorCorrectionLevel: 'H',
  } as any;

  const mockLogoMetrics = {
    logoSizePx: 0,
    logoPaddingPx: 0,
    cutoutModuleSize: 0,
    effectiveLogoSizeModules: 0,
    effectivePaddingModules: 0,
  };

  it('renders standard modules using Math.floor/Math.ceil', () => {
    const ctx = createMockCtx();
    const modules = createMockModules(21, [[10, 10]]);
    renderModules(ctx, modules, { ...baseConfig, style: QRStyle.STANDARD }, 0, 0, 10, 21, mockLogoMetrics, false);

    expect(ctx.rect).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('renders standard modules when isVirtual is true using Math.round', () => {
    const ctx = createMockCtx();
    const modules = createMockModules(21, [[10, 10]]);
    renderModules(ctx, modules, { ...baseConfig, style: QRStyle.STANDARD }, 0, 0, 10, 21, mockLogoMetrics, true);

    expect(ctx.rect).toHaveBeenCalled();
  });

  it('renders modern modules', () => {
    const ctx = createMockCtx();
    const modules = createMockModules(21, [[10, 10]]);
    renderModules(ctx, modules, { ...baseConfig, style: QRStyle.MODERN }, 0, 0, 10, 21, mockLogoMetrics, false);

    expect(ctx.beginPath).toHaveBeenCalled();
  });

  it('renders swiss style modules', () => {
    const ctx = createMockCtx();
    const modules = createMockModules(21, [[10, 10]]);
    renderModules(ctx, modules, { ...baseConfig, style: QRStyle.SWISS }, 0, 0, 10, 21, mockLogoMetrics, false);

    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
  });

  it('renders fluid style modules', () => {
    const ctx = createMockCtx();
    const modules = createMockModules(21, [[10, 10]]);
    renderModules(ctx, modules, { ...baseConfig, style: QRStyle.FLUID }, 0, 0, 10, 21, mockLogoMetrics, false);

    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
  });

  it('renders hive style modules', () => {
    const ctx = createMockCtx();
    const modules = createMockModules(21, [[10, 10]]);
    renderModules(ctx, modules, { ...baseConfig, style: QRStyle.HIVE }, 0, 0, 10, 21, mockLogoMetrics, false);

    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it('renders grunge style modules', () => {
    const ctx = createMockCtx();
    const modules = createMockModules(21, [[10, 10]]);
    renderModules(ctx, modules, { ...baseConfig, style: QRStyle.GRUNGE }, 0, 0, 10, 21, mockLogoMetrics, false);

    expect(ctx.beginPath).toHaveBeenCalled();
  });

  it('renders starburst style modules', () => {
    const ctx = createMockCtx();
    const modules = createMockModules(21, [[10, 10]]);
    renderModules(ctx, modules, { ...baseConfig, style: QRStyle.STARBURST }, 0, 0, 10, 21, mockLogoMetrics, false);

    expect(ctx.lineTo).toHaveBeenCalled();
  });

  it('renders circuit modules with all adjacent direction links', () => {
    const ctx = createMockCtx();
    // Setting up a cross shape: middle cell (10, 10) has active neighbors top, bottom, left, right
    const activeCoords: [number, number][] = [
      [10, 10], // center
      [9, 10],  // top
      [11, 10], // bottom
      [10, 9],  // left
      [10, 11]  // right
    ];
    const modules = createMockModules(21, activeCoords);
    renderModules(ctx, modules, { ...baseConfig, style: QRStyle.CIRCUIT }, 0, 0, 10, 21, mockLogoMetrics, false);

    // Should call rect for drawRoundRect and for links
    expect(ctx.rect).toHaveBeenCalled();
  });

  it('excludes modules covered by logo', () => {
    const ctx = createMockCtx();
    // Center module is (10, 10) in a 21x21 grid
    const modules = createMockModules(21, [[10, 10]]);
    
    // Configure logo and metrics to cover the center cell
    const configWithLogo = {
      ...baseConfig,
      logoUrl: 'http://example.com/logo.png',
      logoPaddingStyle: 'square',
    };
    const logoMetricsWithCutout = {
      ...mockLogoMetrics,
      cutoutModuleSize: 5,
    };

    renderModules(ctx, modules, configWithLogo, 0, 0, 10, 21, logoMetricsWithCutout, false);

    // Since center (10,10) is covered by the logo cutout, no draw commands should be issued for it.
    // The rect method should not have been called to draw any modules (since only (10,10) is active)
    expect(ctx.rect).not.toHaveBeenCalled();
  });
});
