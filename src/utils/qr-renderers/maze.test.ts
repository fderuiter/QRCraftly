import { describe, it, expect, vi } from 'vitest';
import { generateMaze, renderMaze, isFinderEyeZone } from './maze';
import { QRStyle, QRType, QRErrorCorrectionLevel } from '../../types';

describe('isFinderEyeZone', () => {
  it('identifies top-left finder eye zone correctly', () => {
    expect(isFinderEyeZone(0, 0, 21)).toBe(true);
    expect(isFinderEyeZone(3, 3, 21)).toBe(true);
    expect(isFinderEyeZone(7, 7, 21)).toBe(true);
    expect(isFinderEyeZone(8, 8, 21)).toBe(true);
    expect(isFinderEyeZone(-2, -2, 21)).toBe(true);
  });

  it('identifies top-right finder eye zone correctly', () => {
    const size = 21;
    expect(isFinderEyeZone(0, size - 1, size)).toBe(true);
    expect(isFinderEyeZone(0, size - 7, size)).toBe(true);
    expect(isFinderEyeZone(8, size - 9, size)).toBe(true);
    expect(isFinderEyeZone(-2, size + 4, size)).toBe(true);
  });

  it('identifies bottom-left finder eye zone correctly', () => {
    const size = 21;
    expect(isFinderEyeZone(size - 1, 0, size)).toBe(true);
    expect(isFinderEyeZone(size - 7, 0, size)).toBe(true);
    expect(isFinderEyeZone(size - 9, 8, size)).toBe(true);
    expect(isFinderEyeZone(size + 4, -2, size)).toBe(true);
  });

  it('returns false for safe zones', () => {
    const size = 21;
    // (10, 10) is typically a safe middle zone
    expect(isFinderEyeZone(10, 10, size)).toBe(false);
  });
});

describe('generateMaze & renderMaze', () => {
  const createMockModules = (size: number, darkMap: Record<string, boolean> = {}) => {
    return {
      size,
      get: (r: number, c: number) => !!darkMap[`${r},${c}`],
    };
  };

  const baseConfig = {
    value: 'https://qrcraftly.com',
    type: QRType.URL,
    fgColor: '#000000',
    bgColor: '#ffffff',
    style: QRStyle.STANDARD,
    logoUrl: null,
    logoSize: 0.2,
    logoPaddingStyle: 'none' as const,
    logoPadding: 0,
    logoBackgroundColor: '#ffffff',
    eyeColor: '#000000',
    errorCorrectionLevel: QRErrorCorrectionLevel.H,
    isBorderEnabled: false,
    borderSize: 0.05,
    borderColor: '#000000',
    borderStyle: 'solid' as const,
    borderText: '',
    borderTextPosition: 'bottom-center' as const,
    borderTextColor: '#ffffff',
    borderLogoUrl: null,
    borderLogoPosition: 'bottom-center' as const,
    isMazeEnabled: true,
    mazeColor: '#3b82f6',
    showMazeSolution: true,
  } as any;

  const createMockCtx = () => {
    return {
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
    } as unknown as CanvasRenderingContext2D;
  };

  it('generates deterministic maze data', () => {
    const size = 21;
    const modules = createMockModules(size);
    const mazeData = generateMaze(modules, baseConfig, size);

    expect(mazeData.nodes.length).toBeGreaterThan(0);
    expect(mazeData.edges.length).toBeGreaterThan(0);
    expect(mazeData.start).not.toBeNull();
    expect(mazeData.end).not.toBeNull();
    expect(mazeData.solution.length).toBeGreaterThan(1);

    // Verify coordinates are within range [-4, size + 3]
    for (const node of mazeData.nodes) {
      expect(node.r).toBeGreaterThanOrEqual(-4);
      expect(node.r).toBeLessThanOrEqual(size + 3);
      expect(node.c).toBeGreaterThanOrEqual(-4);
      expect(node.c).toBeLessThanOrEqual(size + 3);
    }
  });

  it('excludes dark modules from maze generation', () => {
    const size = 21;
    // Set cell (10, 10) as a dark module
    const modules = createMockModules(size, { '10,10': true });
    const mazeData = generateMaze(modules, baseConfig, size);

    const hasDarkNode = mazeData.nodes.some(n => n.r === 10 && n.c === 10);
    expect(hasDarkNode).toBe(false);
  });

  it('renders nothing if isMazeEnabled is false', () => {
    const ctx = createMockCtx();
    const size = 21;
    const modules = createMockModules(size);
    const disabledConfig = { ...baseConfig, isMazeEnabled: false };

    renderMaze(ctx, modules, disabledConfig, 0, 0, 10, size);

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('renders the maze and start/end markers when isMazeEnabled is true', () => {
    const ctx = createMockCtx();
    const size = 21;
    const modules = createMockModules(size);

    renderMaze(ctx, modules, baseConfig, 0, 0, 10, size);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled(); // for start/end dot
    expect(ctx.restore).toHaveBeenCalled();
  });
});
