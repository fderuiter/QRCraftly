import { describe, it, expect, vi } from 'vitest';
import { generateMaze, renderMaze, isFinderEyeZone, isBridgeCell } from './maze';
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

    // Verify coordinates are strictly within inner matrix range [0, size - 1]
    for (const node of mazeData.nodes) {
      expect(node.r).toBeGreaterThanOrEqual(0);
      expect(node.r).toBeLessThan(size);
      expect(node.c).toBeGreaterThanOrEqual(0);
      expect(node.c).toBeLessThan(size);
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

  describe('Scannability-Audited Bridge Channels', () => {
    it('generates bridges across the safety zones when isMazeBridgesEnabled is true', () => {
      const size = 21;
      const modules = createMockModules(size);
      const configWithBridges = { ...baseConfig, isMazeBridgesEnabled: true };
      const mazeData = generateMaze(modules, configWithBridges, size);

      // Verify that bridge cells are present as nodes in the maze
      const tlBridgeNodes = mazeData.nodes.filter(n => n.c === 3 && n.r >= 6 && n.r <= 8);
      const trBridgeNodes = mazeData.nodes.filter(n => n.c === size - 4 && n.r >= 6 && n.r <= 8);
      const blBridgeNodes = mazeData.nodes.filter(n => n.r === size - 4 && n.c >= 6 && n.c <= 8);

      expect(tlBridgeNodes.length).toBe(3);
      expect(trBridgeNodes.length).toBe(3);
      expect(blBridgeNodes.length).toBe(3);

      // Verify that edges are created for the bridge paths
      const tlBridgeEdges = mazeData.edges.filter(e => 
        (e.u.c === 3 && e.u.r === 6 && e.v.c === 3 && e.v.r === 7) ||
        (e.u.c === 3 && e.u.r === 7 && e.v.c === 3 && e.v.r === 6) ||
        (e.u.c === 3 && e.u.r === 7 && e.v.c === 3 && e.v.r === 8) ||
        (e.u.c === 3 && e.u.r === 8 && e.v.c === 3 && e.v.r === 7)
      );
      expect(tlBridgeEdges.length).toBe(2);
    });

    it('does not generate bridges when isMazeBridgesEnabled is false', () => {
      const size = 21;
      const modules = createMockModules(size);
      const configNoBridges = { ...baseConfig, isMazeBridgesEnabled: false };
      const mazeData = generateMaze(modules, configNoBridges, size);

      // Verify that bridge cells in safety zone (r=7,8 for TL/TR, c=7,8 for BL) are NOT present
      const tlBridgeNodes = mazeData.nodes.filter(n => n.c === 3 && n.r >= 7 && n.r <= 8);
      const trBridgeNodes = mazeData.nodes.filter(n => n.c === size - 4 && n.r >= 7 && n.r <= 8);
      const blBridgeNodes = mazeData.nodes.filter(n => n.r === size - 4 && n.c >= 7 && n.c <= 8);

      expect(tlBridgeNodes.length).toBe(0);
      expect(trBridgeNodes.length).toBe(0);
      expect(blBridgeNodes.length).toBe(0);
    });

    it('excludes logo cutout area from maze nodes', () => {
      const size = 21;
      const modules = createMockModules(size);
      const logoConfig = {
        ...baseConfig,
        logoUrl: 'https://example.com/logo.png',
        logoSize: 0.3,
        logoPaddingStyle: 'circle',
        logoPadding: 2,
      };
      const mazeData = generateMaze(modules, logoConfig, size);
      // Since logo is centered, nodes near the center should be excluded
      const centerNode = mazeData.nodes.some(n => n.r === 10 && n.c === 10);
      expect(centerNode).toBe(false);
    });

    it('enables bridges by default if isMazeBridgesEnabled is undefined', () => {
      const size = 21;
      const modules = createMockModules(size);
      const { isMazeBridgesEnabled, ...configWithoutBridgesProp } = baseConfig;
      const mazeData = generateMaze(modules, configWithoutBridgesProp, size);

      // Verify that bridge cells are present as nodes in the maze
      const tlBridgeNodes = mazeData.nodes.filter(n => n.c === 3 && n.r >= 6 && n.r <= 8);
      expect(tlBridgeNodes.length).toBe(3);
    });

    it('does not render solution path if showMazeSolution is false', () => {
      const ctx = createMockCtx();
      const size = 21;
      const modules = createMockModules(size);
      const noSolutionConfig = { ...baseConfig, showMazeSolution: false };

      renderMaze(ctx, modules, noSolutionConfig, 0, 0, 10, size);

      // Verify we only stroke once for the maze edges and skip the solution path
      expect(ctx.stroke).toHaveBeenCalledTimes(1);
    });

    it('handles rendering with null start or end nodes', () => {
      const ctx = createMockCtx();
      const mockMazeData = {
        nodes: [],
        edges: [],
        start: null,
        end: null,
        solution: [],
      };
      const size = 21;
      const modules = createMockModules(size);

      renderMaze(ctx, modules, baseConfig, 0, 0, 10, size, mockMazeData);

      // Should not call arc since start/end are null
      expect(ctx.arc).not.toHaveBeenCalled();
    });

    it('covers all branch conditions in isFinderEyeZone', () => {
      const size = 21;
      // Condition 1: r >= -2 && r <= 8 && c >= -2 && c <= 8
      expect(isFinderEyeZone(-3, 0, size)).toBe(false); // r < -2
      expect(isFinderEyeZone(9, 0, size)).toBe(false);  // r > 8
      expect(isFinderEyeZone(0, -3, size)).toBe(false); // c < -2
      expect(isFinderEyeZone(0, 9, size)).toBe(false);  // c > 8

      // Condition 2: r >= -2 && r <= 8 && c >= size - 9 && c <= size + 4
      expect(isFinderEyeZone(0, size - 10, size)).toBe(false); // c < size - 9
      expect(isFinderEyeZone(0, size + 5, size)).toBe(false);  // c > size + 4

      // Condition 3: r >= size - 9 && r <= size + 4 && c >= -2 && c <= 8
      expect(isFinderEyeZone(size - 10, 0, size)).toBe(false); // r < size - 9
      expect(isFinderEyeZone(size + 5, 0, size)).toBe(false);  // r > size + 4
    });

    it('covers all branch conditions in isBridgeCell', () => {
      const size = 21;
      // Condition 1: c === 3 && r >= 6 && r <= 8
      expect(isBridgeCell(5, 3, size)).toBe(false); // r < 6
      expect(isBridgeCell(9, 3, size)).toBe(false); // r > 8
      expect(isBridgeCell(6, 4, size)).toBe(false); // c !== 3

      // Condition 2: c === size - 4 && r >= 6 && r <= 8
      expect(isBridgeCell(5, size - 4, size)).toBe(false); // r < 6
      expect(isBridgeCell(9, size - 4, size)).toBe(false); // r > 8
      expect(isBridgeCell(6, size - 5, size)).toBe(false); // c !== size - 4

      // Condition 3: r === size - 4 && c >= 6 && c <= 8
      expect(isBridgeCell(size - 4, 5, size)).toBe(false); // c < 6
      expect(isBridgeCell(size - 4, 9, size)).toBe(false); // c > 8
      expect(isBridgeCell(size - 5, 6, size)).toBe(false); // r !== size - 4
    });

    it('covers process.env.NODE_ENV cache and empty nodes branch', () => {
      const size = 21;
      const modules = createMockModules(size);
      
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        // Run once to cache
        generateMaze(modules, baseConfig, size);
        // Run again to hit cache
        const cachedMaze = generateMaze(modules, baseConfig, size);
        expect(cachedMaze).toBeDefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }

      // Generate with empty nodes by passing negative size
      const emptyMaze = generateMaze(modules, baseConfig, -10);
      expect(emptyMaze.nodes.length).toBe(0);
      expect(emptyMaze.start).toBeNull();
    });

    it('renders with custom mazePathWidth and custom colors', () => {
      const ctx = createMockCtx();
      const size = 21;
      const modules = createMockModules(size);
      const customConfig = {
        ...baseConfig,
        mazePathWidth: 0.5,
        mazeColor: undefined, // test default color path too
      };

      renderMaze(ctx, modules, customConfig, 0, 0, 10, size);
      expect(ctx.save).toHaveBeenCalled();
    });

    it('covers dark module on a bridge cell', () => {
      const size = 21;
      // Bridge cell (7, 3) is set as dark module
      const modules = createMockModules(size, { '7,3': true });
      const configWithBridges = { ...baseConfig, isMazeBridgesEnabled: true };
      const mazeData = generateMaze(modules, configWithBridges, size);

      // Verify that (7, 3) is STILL present as a node in the maze because it is a bridge!
      const bridgeNode = mazeData.nodes.find(n => n.r === 7 && n.c === 3);
      expect(bridgeNode).toBeDefined();
    });

    it('covers special edge case branches for 100 percent coverage', () => {
      const size = 21;
      const modules = createMockModules(size);

      // 1. Empty value to test seedRandom('') empty loop branch
      const emptyValConfig = { ...baseConfig, value: '' };
      generateMaze(modules, emptyValConfig, size);

      // 2. Single node grid (where all except one cell are dark) to test bestEnd/solution null
      const singleNodeModules = createMockModules(10, {
        ...Array.from({ length: 10 }).reduce((acc: any, _, r) => {
          for (let c = 0; c < 10; c++) {
            if (!(r === 9 && c === 9)) acc[`${r},${c}`] = true;
          }
          return acc;
        }, {}),
      });
      const singleNodeMaze = generateMaze(singleNodeModules, { ...baseConfig, isMazeBridgesEnabled: false }, 10);
      expect(singleNodeMaze.nodes.length).toBe(1);
      expect(singleNodeMaze.start).toBeNull();

      // 3. Small grid where solved path is <= 10 steps, testing dynamic step threshold adaptation
      const smallGridModules = createMockModules(12);
      const smallGridMaze = generateMaze(smallGridModules, { ...baseConfig, isMazeBridgesEnabled: false }, 12);
      expect(smallGridMaze.nodes.length).toBeGreaterThan(1);
      expect(smallGridMaze.solution.length).toBeGreaterThan(1); // dynamically adapted step threshold produces solvable path
    });
  });
});
