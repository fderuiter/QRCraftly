import { describe, it, expect } from 'vitest';
import { hexToRgb, luminance, contrastRatio, blendColor } from '../scripts/contrast_check.js';

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
});
