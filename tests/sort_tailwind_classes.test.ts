import { describe, it, expect } from 'vitest';
import { sortClassString, sortClassesInContent } from '../scripts/sort_tailwind_classes.js';

describe('sort_tailwind_classes', () => {
  describe('sortClassString', () => {
    it('should sort classes alphabetically', () => {
      expect(sortClassString('flex items-center justify-between px-4 py-2')).toBe(
        'flex items-center justify-between px-4 py-2'
      );
      expect(sortClassString('z-10 absolute pointer-events-none')).toBe(
        'absolute pointer-events-none z-10'
      );
    });

    it('should deduplicate class names', () => {
      expect(sortClassString('flex flex items-center items-center')).toBe(
        'flex items-center'
      );
    });

    it('should preserve template interpolation sections intact', () => {
      expect(sortClassString('w-full ${disabled ? "opacity-50" : "hover:bg-slate-100"} px-4')).toBe(
        'w-full ${disabled ? "opacity-50" : "hover:bg-slate-100"} px-4'
      );
    });

    it('should handle leading/trailing spaces gracefully', () => {
      expect(sortClassString('  b a  ')).toBe(' a b ');
    });
  });

  describe('sortClassesInContent', () => {
    it('should replace className double-quoted values', () => {
      const input = '<div className="z-10 absolute flex" />';
      const expected = '<div className="absolute flex z-10" />';
      expect(sortClassesInContent(input)).toBe(expected);
    });

    it('should replace className single-quoted values', () => {
      const input = "<div className='z-10 absolute flex' />";
      const expected = "<div className='absolute flex z-10' />";
      expect(sortClassesInContent(input)).toBe(expected);
    });

    it('should replace className template literal values', () => {
      const input = 'className={`z-10 absolute ${extra} flex`}';
      const expected = 'className={`absolute z-10 ${extra} flex`}';
      expect(sortClassesInContent(input)).toBe(expected);
    });

    it('should replace specific styling variables in ui components precisely', () => {
      const input = 'const BASE_INPUT_CLASSES = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";';
      const sorted = sortClassesInContent(input);
      expect(sorted).toContain('border border-slate-300 px-3 py-2 rounded-md text-sm w-full');
    });
  });
});
