import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isFinderEyeZone,
  isFinderSeparatorZone,
  isFinderProtected,
  extractFluidContours,
  drawFluidContours,
  renderFluidModules,
  clearFluidCache,
} from './fluid';

describe('fluid renderer', () => {
  const moduleCount = 21;

  beforeEach(() => {
    clearFluidCache();
  });

  const createMockCtx = () => {
    return {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  };

  describe('finder zone protection', () => {
    it('correctly identifies finder eyes in all 3 corners', () => {
      // Top-Left (0..6, 0..6)
      expect(isFinderEyeZone(0, 0, moduleCount)).toBe(true);
      expect(isFinderEyeZone(6, 6, moduleCount)).toBe(true);
      expect(isFinderEyeZone(7, 7, moduleCount)).toBe(false);

      // Top-Right (0..6, 14..20)
      expect(isFinderEyeZone(0, 20, moduleCount)).toBe(true);
      expect(isFinderEyeZone(6, 14, moduleCount)).toBe(true);

      // Bottom-Left (14..20, 0..6)
      expect(isFinderEyeZone(20, 0, moduleCount)).toBe(true);
      expect(isFinderEyeZone(14, 6, moduleCount)).toBe(true);

      // Data area
      expect(isFinderEyeZone(10, 10, moduleCount)).toBe(false);
    });

    it('correctly identifies the 1-module quiet separator zone', () => {
      // TL separator: row 7, col 7
      expect(isFinderSeparatorZone(7, 5, moduleCount)).toBe(true);
      expect(isFinderSeparatorZone(5, 7, moduleCount)).toBe(true);
      expect(isFinderSeparatorZone(7, 7, moduleCount)).toBe(true);
      expect(isFinderSeparatorZone(8, 8, moduleCount)).toBe(false);

      // TR separator: row 7, col N-8 (13)
      expect(isFinderSeparatorZone(7, 13, moduleCount)).toBe(true);
      expect(isFinderSeparatorZone(5, 13, moduleCount)).toBe(true);

      // BL separator: row N-8 (13), col 7
      expect(isFinderSeparatorZone(13, 5, moduleCount)).toBe(true);
      expect(isFinderSeparatorZone(13, 7, moduleCount)).toBe(true);
    });

    it('flags cells within the protected 8x8 corner regions', () => {
      expect(isFinderProtected(0, 0, moduleCount)).toBe(true);
      expect(isFinderProtected(7, 7, moduleCount)).toBe(true);
      expect(isFinderProtected(8, 8, moduleCount)).toBe(false);
      expect(isFinderProtected(10, 10, moduleCount)).toBe(false);
    });
  });

  describe('extractFluidContours', () => {
    it('returns empty contours when grid has no active modules', () => {
      const grid = new Uint8Array(moduleCount * moduleCount);
      const contours = extractFluidContours(grid, moduleCount, 0, 0, 10);
      expect(contours).toHaveLength(0);
    });

    it('extracts a single 4-vertex loop for an isolated module', () => {
      const grid = new Uint8Array(moduleCount * moduleCount);
      grid[10 * moduleCount + 10] = 1;

      const cellSize = 10;
      const contours = extractFluidContours(grid, moduleCount, 0, 0, cellSize);

      expect(contours).toHaveLength(1);
      const loop = contours[0];
      expect(loop.length).toBe(4);

      // Vertices should be at cell boundary: x in [100, 110], y in [100, 110]
      const xs = loop.map((p) => p.x);
      const ys = loop.map((p) => p.y);
      expect(Math.min(...xs)).toBeCloseTo(100);
      expect(Math.max(...xs)).toBeCloseTo(110);
      expect(Math.min(...ys)).toBeCloseTo(100);
      expect(Math.max(...ys)).toBeCloseTo(110);
    });

    it('fuses two horizontally adjacent modules into one continuous contour', () => {
      const grid = new Uint8Array(moduleCount * moduleCount);
      grid[10 * moduleCount + 10] = 1;
      grid[10 * moduleCount + 11] = 1;

      const cellSize = 10;
      const contours = extractFluidContours(grid, moduleCount, 0, 0, cellSize);

      // Should be a single unified loop spanning both cells
      expect(contours).toHaveLength(1);
      const loop = contours[0];
      // 4 corners of the 2x1 rectangle (simplified)
      expect(loop.length).toBe(4);

      const xs = loop.map((p) => p.x);
      expect(Math.min(...xs)).toBeCloseTo(100);
      expect(Math.max(...xs)).toBeCloseTo(120); // Spans 2 cells
    });

    it('fuses two vertically adjacent modules into one continuous contour', () => {
      const grid = new Uint8Array(moduleCount * moduleCount);
      grid[10 * moduleCount + 10] = 1;
      grid[11 * moduleCount + 10] = 1;

      const cellSize = 10;
      const contours = extractFluidContours(grid, moduleCount, 0, 0, cellSize);

      expect(contours).toHaveLength(1);
      const loop = contours[0];
      expect(loop.length).toBe(4);

      const ys = loop.map((p) => p.y);
      expect(Math.min(...ys)).toBeCloseTo(100);
      expect(Math.max(...ys)).toBeCloseTo(120); // Spans 2 cells vertically
    });

    it('fuses a 2x2 block of modules into a single outer contour with no internal seams', () => {
      const grid = new Uint8Array(moduleCount * moduleCount);
      grid[10 * moduleCount + 10] = 1;
      grid[10 * moduleCount + 11] = 1;
      grid[11 * moduleCount + 10] = 1;
      grid[11 * moduleCount + 11] = 1;

      const cellSize = 10;
      const contours = extractFluidContours(grid, moduleCount, 0, 0, cellSize);

      expect(contours).toHaveLength(1);
      const loop = contours[0];
      expect(loop.length).toBe(4);

      const xs = loop.map((p) => p.x);
      const ys = loop.map((p) => p.y);
      expect(Math.min(...xs)).toBeCloseTo(100);
      expect(Math.max(...xs)).toBeCloseTo(120);
      expect(Math.min(...ys)).toBeCloseTo(100);
      expect(Math.max(...ys)).toBeCloseTo(120);
    });

    it('extracts an L-shaped cluster with an inner concave corner', () => {
      const grid = new Uint8Array(moduleCount * moduleCount);
      grid[10 * moduleCount + 10] = 1;
      grid[10 * moduleCount + 11] = 1;
      grid[11 * moduleCount + 10] = 1;
      // (11, 11) is empty

      const cellSize = 10;
      const contours = extractFluidContours(grid, moduleCount, 0, 0, cellSize);

      expect(contours).toHaveLength(1);
      const loop = contours[0];
      // An L-shape has 6 boundary vertices
      expect(loop.length).toBe(6);
    });

    it('bridges diagonally adjacent modules with a calibrated fluid neck', () => {
      const grid = new Uint8Array(moduleCount * moduleCount);
      grid[10 * moduleCount + 10] = 1;
      grid[11 * moduleCount + 11] = 1;
      // (10, 11) and (11, 10) are empty

      const cellSize = 10;
      const contours = extractFluidContours(grid, moduleCount, 0, 0, cellSize);

      // Diagonally touching modules bridge into a single connected contour
      expect(contours).toHaveLength(1);
    });

    it('suppresses diagonal bridges across finder separator boundaries', () => {
      const grid = new Uint8Array(moduleCount * moduleCount);
      // (7, 8) and (8, 7) are touching row 7 / col 7 separator
      grid[7 * moduleCount + 8] = 1;
      grid[8 * moduleCount + 7] = 1;

      const cellSize = 10;
      const contours = extractFluidContours(grid, moduleCount, 0, 0, cellSize);

      // Bridges into or across the separator must be suppressed
      // Both remain separate contours
      expect(contours.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('drawFluidContours and renderFluidModules', () => {
    it('draws smooth quadratic curves for rounded corners', () => {
      const ctx = createMockCtx();
      const grid = new Uint8Array(moduleCount * moduleCount);
      grid[10 * moduleCount + 10] = 1;

      renderFluidModules(ctx, grid, 0, 0, 10, moduleCount);

      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.quadraticCurveTo).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
    });

    it('uses cached contours on consecutive calls with identical parameters', () => {
      const ctx = createMockCtx();
      const grid = new Uint8Array(moduleCount * moduleCount);
      grid[10 * moduleCount + 10] = 1;

      renderFluidModules(ctx, grid, 0, 0, 10, moduleCount);
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);

      // Second call should hit the cache and draw the same contour
      renderFluidModules(ctx, grid, 0, 0, 10, moduleCount);
      expect(ctx.moveTo).toHaveBeenCalledTimes(2);
    });
  });
});

