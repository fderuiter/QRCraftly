import { describe, it, expect } from 'vitest';
import { appendSaltToUrl, isMazeSolvable } from './mazeHelpers';
import { QRModules } from '../types';

describe('mazeHelpers', () => {
  describe('appendSaltToUrl', () => {
    it('appends salt as a query parameter to a simple URL', () => {
      expect(appendSaltToUrl('https://example.com', 42)).toBe('https://example.com/?salt=42');
    });

    it('appends salt using ampersand if query parameters already exist', () => {
      expect(appendSaltToUrl('https://example.com?foo=bar', 42)).toBe('https://example.com/?foo=bar&salt=42');
    });

    it('falls back to manual appending if the input is a relative path or invalid URL', () => {
      expect(appendSaltToUrl('/relative-path', 7)).toBe('/relative-path?salt=7');
      expect(appendSaltToUrl('/relative-path?existing=1', 7)).toBe('/relative-path?existing=1&salt=7');
    });
  });

  describe('isMazeSolvable', () => {
    const createMockModules = (grid: boolean[][]): QRModules => ({
      size: grid.length,
      get: (r, c) => grid[r][c],
    });

    it('returns true for a simple solvable maze of light modules', () => {
      // 0 represents path (false), 1 represents wall (true)
      const grid = [
        [false, false, true],
        [true, false, true],
        [true, false, false],
      ];
      const modules = createMockModules(grid);
      expect(isMazeSolvable(modules, { r: 0, c: 0 }, { r: 2, c: 2 })).toBe(true);
    });

    it('returns false if there is no path of light modules from entry to exit', () => {
      const grid = [
        [false, true, false],
        [true, true, false],
        [false, false, false],
      ];
      const modules = createMockModules(grid);
      expect(isMazeSolvable(modules, { r: 0, c: 0 }, { r: 2, c: 2 })).toBe(false);
    });

    it('returns false if entry or exit points are out of bounds', () => {
      const grid = [
        [false, false],
        [false, false],
      ];
      const modules = createMockModules(grid);
      expect(isMazeSolvable(modules, { r: -1, c: 0 }, { r: 1, c: 1 })).toBe(false);
      expect(isMazeSolvable(modules, { r: 0, c: 0 }, { r: 2, c: 1 })).toBe(false);
    });

    it('returns false if entry or exit cells are walls', () => {
      const grid = [
        [true, false],
        [false, false],
      ];
      const modules = createMockModules(grid);
      expect(isMazeSolvable(modules, { r: 0, c: 0 }, { r: 1, c: 1 })).toBe(false);
    });
  });
});
