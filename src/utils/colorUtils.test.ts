/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, it, expect } from 'vitest';
import { getContrastRatio } from './colorUtils';

describe('colorUtils', () => {
  describe('getContrastRatio', () => {
    it('returns maximum contrast for black on white', () => {
      const contrast = getContrastRatio('#000000', '#ffffff');
      expect(contrast).toBeCloseTo(21, 1);
    });

    it('returns maximum contrast for white on black', () => {
      const contrast = getContrastRatio('#ffffff', '#000000');
      expect(contrast).toBeCloseTo(21, 1);
    });

    it('supports 3-digit hex codes', () => {
      expect(getContrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
      expect(getContrastRatio('#000', '#fff')).toBeCloseTo(21, 1);
      expect(getContrastRatio('#fff', '#000000')).toBeCloseTo(21, 1);
      // Mixed length
      expect(getContrastRatio('#F00', '#000000')).toBeCloseTo(5.25, 2); // Red on Black
    });

    it('returns 1 for same colors', () => {
      expect(getContrastRatio('#ffffff', '#ffffff')).toBe(1);
      expect(getContrastRatio('#000000', '#000000')).toBe(1);
      expect(getContrastRatio('#123456', '#123456')).toBe(1);
      expect(getContrastRatio('#123', '#123')).toBe(1);
    });

    it('returns 0 for invalid inputs', () => {
      // Test length checks
      expect(getContrastRatio('', '#000000')).toBe(0);

      // We can't easily test null/undefined types in TS without casting,
      // but the runtime check handles it if passed from JS.
      expect(getContrastRatio(null as any, '#000000')).toBe(0);
      expect(getContrastRatio('#000000', undefined as any)).toBe(0);
    });

    it('returns 0 for non-hex characters', () => {
      // #GGGGGG is invalid but has length 7.
      expect(getContrastRatio('#GGGGGG', '#FFFFFF')).toBe(0);
      expect(getContrastRatio('#FFFFFF', '#GGGGGG')).toBe(0);
      expect(getContrastRatio('#12345Z', '#FFFFFF')).toBe(0);
      // Invalid 3-digit-like
      expect(getContrastRatio('#GGG', '#FFFFFF')).toBe(0);
    });

    it('calculates WCAG 2.0 contrast ratio correctly', () => {
      // #205081 (Blue) on #FFFFFF (White) -> Approx 8.31
      // L_blue ≈ 0.076, L_white = 1.0
      // (1 + 0.05) / (0.076 + 0.05) ≈ 1.05 / 0.126 = 8.33
      expect(getContrastRatio('#205081', '#FFFFFF')).toBeCloseTo(8.31, 1);

      // #205081 (Blue) on #000000 (Black) -> Approx 2.52
      // L_blue ≈ 0.076, L_black = 0
      // (0.076 + 0.05) / (0 + 0.05) ≈ 0.126 / 0.05 = 2.52
      expect(getContrastRatio('#205081', '#000000')).toBeCloseTo(2.52, 1);
    });
  });
});
