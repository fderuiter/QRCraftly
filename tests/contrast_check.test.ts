import { describe, it, expect } from 'vitest';
import { hexToRgb, luminance, contrastRatio, blendColor, validateKeys } from '../scripts/contrast_check.js';

describe('contrast_check', () => {
  describe('hexToRgb', () => {
    it('should parse 6-digit hex strings with hash', () => {
      expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
      expect(hexToRgb('#123456')).toEqual([18, 52, 86]);
    });

    it('should parse 6-digit hex strings without hash', () => {
      expect(hexToRgb('ffffff')).toEqual([255, 255, 255]);
      expect(hexToRgb('000000')).toEqual([0, 0, 0]);
    });

    it('should parse 3-digit hex strings', () => {
      expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000')).toEqual([0, 0, 0]);
      expect(hexToRgb('123')).toEqual([17, 34, 51]);
    });
  });

  describe('luminance', () => {
    it('should compute 1.0 for white and 0.0 for black', () => {
      expect(luminance([255, 255, 255])).toBeCloseTo(1.0, 4);
      expect(luminance([0, 0, 0])).toBeCloseTo(0.0, 4);
    });

    it('should compute standard values for other colors', () => {
      const redLum = luminance([255, 0, 0]);
      const greenLum = luminance([0, 255, 0]);
      const blueLum = luminance([0, 0, 255]);
      
      expect(redLum).toBeCloseTo(0.2126, 4);
      expect(greenLum).toBeCloseTo(0.7152, 4);
      expect(blueLum).toBeCloseTo(0.0722, 4);
    });
  });

  describe('contrastRatio', () => {
    it('should return 21 for black and white', () => {
      expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 1);
      expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
    });

    it('should return 1 for identical colors', () => {
      expect(contrastRatio([128, 128, 128], [128, 128, 128])).toBeCloseTo(1, 4);
    });
  });

  describe('blendColor', () => {
    it('should correctly blend foreground and background with opacity', () => {
      // White on Black at 50% opacity -> Middle Gray
      expect(blendColor([255, 255, 255], [0, 0, 0], 0.5)).toEqual([128, 128, 128]);
      // Blue on Red at 0% opacity -> Red
      expect(blendColor([0, 0, 255], [255, 0, 0], 0.0)).toEqual([255, 0, 0]);
      // Blue on Red at 100% opacity -> Blue
      expect(blendColor([0, 0, 255], [255, 0, 0], 1.0)).toEqual([0, 0, 255]);
    });
  });

  describe('validateKeys', () => {
    const mockColors = {
      'white': '#ffffff',
      'black': '#000000',
      'slate-50': '#f8fafc',
      'slate-900': '#0f172a',
      'teal-100': '#ccfbf1',
      'teal-700': '#0f766e',
      'teal-900': '#134e4a',
      'slate-800': '#1e293b'
    };

    it('should return empty array when all scenario colors exist in the colors dictionary', () => {
      const mockScenarios = [
        { mode: 'Light', element: 'Page Background', bg: 'slate-50', fg: 'slate-900', text: 'H1', size: 'large' },
        { mode: 'Dark', element: 'Icon Teal', bg: ['teal-900', 0.3, 'slate-800'], fg: 'teal-100', text: 'Shield Icon', size: 'large' }
      ];

      const result = validateKeys(mockScenarios, mockColors);
      expect(result).toEqual([]);
    });

    it('should identify a missing foreground color key', () => {
      const mockScenarios = [
        { mode: 'Light', element: 'Page Background', bg: 'slate-50', fg: 'missing-fg-key', text: 'H1', size: 'large' }
      ];

      const result = validateKeys(mockScenarios, mockColors);
      expect(result).toEqual(['missing-fg-key']);
    });

    it('should identify a missing string background color key', () => {
      const mockScenarios = [
        { mode: 'Light', element: 'Page Background', bg: 'missing-bg-key', fg: 'slate-900', text: 'H1', size: 'large' }
      ];

      const result = validateKeys(mockScenarios, mockColors);
      expect(result).toEqual(['missing-bg-key']);
    });

    it('should identify missing keys inside an array background configuration', () => {
      const mockScenarios = [
        { mode: 'Dark', element: 'Icon Teal', bg: ['missing-overlay', 0.3, 'slate-800'], fg: 'teal-100', text: 'Shield Icon', size: 'large' },
        { mode: 'Dark', element: 'Icon Teal', bg: ['teal-900', 0.3, 'missing-base'], fg: 'teal-100', text: 'Shield Icon', size: 'large' }
      ];

      const result = validateKeys(mockScenarios, mockColors);
      expect(result).toContain('missing-overlay');
      expect(result).toContain('missing-base');
      expect(result.length).toBe(2);
    });

    it('should compile all unique missing keys simultaneously', () => {
      const mockScenarios = [
        { mode: 'Light', element: 'Page Background', bg: 'missing-bg-1', fg: 'missing-fg-1', text: 'H1', size: 'large' },
        { mode: 'Dark', element: 'Icon Teal', bg: ['missing-bg-2', 0.3, 'missing-bg-3'], fg: 'teal-100', text: 'Shield Icon', size: 'large' },
        { mode: 'Light', element: 'Card', bg: 'missing-bg-1', fg: 'slate-900', text: 'Card H3', size: 'normal' } // Duplicate missing key
      ];

      const result = validateKeys(mockScenarios, mockColors);
      expect(result).toContain('missing-bg-1');
      expect(result).toContain('missing-fg-1');
      expect(result).toContain('missing-bg-2');
      expect(result).toContain('missing-bg-3');
      expect(result.length).toBe(4);
    });

    it('should handle empty or missing scenarios list gracefully', () => {
      expect(validateKeys(null, mockColors)).toEqual([]);
      expect(validateKeys(undefined, mockColors)).toEqual([]);
      expect(validateKeys([], mockColors)).toEqual([]);
    });

    it('should handle empty or missing colors dictionary gracefully by treating everything as missing', () => {
      const mockScenarios = [
        { mode: 'Light', element: 'Page Background', bg: 'slate-50', fg: 'slate-900', text: 'H1', size: 'large' }
      ];
      expect(validateKeys(mockScenarios, null)).toEqual(['slate-900', 'slate-50']);
      expect(validateKeys(mockScenarios, undefined)).toEqual(['slate-900', 'slate-50']);
      expect(validateKeys(mockScenarios, {})).toEqual(['slate-900', 'slate-50']);
    });
  });
});
