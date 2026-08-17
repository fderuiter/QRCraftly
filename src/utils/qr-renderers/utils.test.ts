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
import { calculateLayout, getLogoMetrics, getIsCoveredByLogo, getAlignmentPatternCenters, isAlignmentPatternZone, ALIGNMENT_PATTERN_COORDINATES } from './utils';
import { DEFAULT_CONFIG } from '../../constants';
import { QRConfig, QRErrorCorrectionLevel } from '../../types';

describe('QR Renderer Utils', () => {
  describe('calculateLayout', () => {
    it('calculates layout without border', () => {
      const config = { ...DEFAULT_CONFIG, isBorderEnabled: false };
      const result = calculateLayout(config, 100, 25);
      expect(result).toEqual({
        drawX: 12.121212121212121,
        drawY: 12.121212121212121,
        drawSize: 75.75757575757575,
        cellSize: 3.03030303030303,
        borderPx: 12.121212121212121
      });
    });

    it('calculates layout with border', () => {
      const config = { ...DEFAULT_CONFIG, isBorderEnabled: true, borderSize: 0.1 };
      const result = calculateLayout(config, 100, 20);
      // Border is 10% of 100 = 10px
      // drawSize = 100 - (10*2) = 80
      // cellSize = 80 / 20 = 4
      expect(result).toEqual({
        drawX: 14.285714285714286,
        drawY: 14.285714285714286,
        drawSize: 71.42857142857143,
        cellSize: 3.5714285714285716,
        borderPx: 14.285714285714286
      });
    });

    it('calculates layout with border when borderPx >= minBorderPx', () => {
      const config = { ...DEFAULT_CONFIG, isBorderEnabled: true, borderSize: 0.3 };
      const result = calculateLayout(config, 100, 20);
      // borderPx = 30px
      // minBorderPx = (4 * 100) / (20 + 8) = 14.2857
      // borderPx >= minBorderPx is true, so borderPx remains 30
      // drawSize = 100 - (30*2) = 40
      // cellSize = 40 / 20 = 2
      expect(result).toEqual({
        drawX: 30,
        drawY: 30,
        drawSize: 40,
        cellSize: 2,
        borderPx: 30
      });
    });
  });

  describe('getLogoMetrics', () => {
    const cellSize = 10;
    const moduleCount = 21; // Standard V1 QR Code

    it('calculates metrics for logo within safe limits', () => {
      const config: QRConfig = {
        ...DEFAULT_CONFIG,
        logoSize: 0.2, // 20% of 21 = 4.2 modules
        logoPadding: 0,
        logoPaddingStyle: 'none',
        errorCorrectionLevel: QRErrorCorrectionLevel.H // Safe ratio 0.50
      };

      const metrics = getLogoMetrics(config, moduleCount, cellSize);

      // Logo size modules: 4.2
      // Safe limit: 21 * 0.5 = 10.5
      // 4.2 <= 10.5, so no scaling
      expect(metrics.effectiveLogoSizeModules).toBeCloseTo(4.2);
      expect(metrics.logoSizePx).toBeCloseTo(42); // 4.2 * 10
      expect(metrics.effectivePaddingModules).toBe(0);
    });

    it('scales down logo if it exceeds safe limit for Low error correction', () => {
      const config: QRConfig = {
        ...DEFAULT_CONFIG,
        logoSize: 0.3, // 30% of 21 = 6.3 modules
        logoPadding: 0,
        logoPaddingStyle: 'none',
        errorCorrectionLevel: QRErrorCorrectionLevel.L // Safe ratio 0.22
      };

      // Safe limit: 21 * 0.22 = 4.62 modules
      // Requested: 6.3 modules
      // Should scale down to fit 4.62

      const metrics = getLogoMetrics(config, moduleCount, cellSize);
      expect(metrics.effectiveLogoSizeModules).toBeCloseTo(4.62);
      expect(metrics.cutoutModuleSize).toBeCloseTo(4.62);
    });

    it('scales down logo considering padding', () => {
        // Safe limit for M is 0.35 * 21 = 7.35 modules
        const config: QRConfig = {
            ...DEFAULT_CONFIG,
            logoSize: 0.3, // 6.3 modules
            logoPadding: 1, // + 2 modules (1 each side) = 8.3 modules total requested
            logoPaddingStyle: 'square',
            errorCorrectionLevel: QRErrorCorrectionLevel.M
        };

        // Requested total cutout: 8.3 modules
        // Max allowed: 7.35 modules
        // Scale factor: 7.35 / 8.3 ≈ 0.8855

        const metrics = getLogoMetrics(config, moduleCount, cellSize);
        expect(metrics.cutoutModuleSize).toBeCloseTo(7.35);
        // Padding should also be scaled
        expect(metrics.effectivePaddingModules).toBeLessThan(1);
    });

    it('defaults to 0.50 safe area ratio for invalid error correction levels', () => {
        const config: any = {
            ...DEFAULT_CONFIG,
            logoSize: 0.4, // 40% of 21 = 8.4 modules
            logoPadding: 0,
            logoPaddingStyle: 'none',
            errorCorrectionLevel: 'INVALID' // Trigger the ?? 0.50 fallback
        };

        const metrics = getLogoMetrics(config, moduleCount, cellSize);

        // Since default is 0.50, and 0.4 < 0.50, no scaling should occur
        expect(metrics.effectiveLogoSizeModules).toBeCloseTo(8.4);
    });
  });

  describe('getIsCoveredByLogo', () => {
    const moduleCount = 21;
    const cellSize = 10;

    it('returns false for everything if no logoUrl', () => {
      const config = { ...DEFAULT_CONFIG, logoUrl: null };
      const metrics = getLogoMetrics(config, moduleCount, cellSize);
      const isCovered = getIsCoveredByLogo(config, moduleCount, metrics);

      // Center
      expect(isCovered(10, 10)).toBe(false);
    });

    it('covers square area correctly', () => {
      const config: QRConfig = {
          ...DEFAULT_CONFIG,
          logoUrl: 'test.png',
          logoPaddingStyle: 'square',
          logoSize: 0.2, // ~4.2 modules
          logoPadding: 0
      };
      // Effective size ~4.2 modules.
      // Center is 10.5
      // Radius ~2.1 modules from center.
      // Modules 9, 10, 11 should be covered (roughly)
      // 8.4 -> 12.6 range

      const metrics = getLogoMetrics(config, moduleCount, cellSize);
      const isCovered = getIsCoveredByLogo(config, moduleCount, metrics);

      // Center should be covered
      expect(isCovered(10, 10)).toBe(true);

      // Far corner should not
      expect(isCovered(0, 0)).toBe(false);

      // Edge of the logo (approx module 8 is out, 9 is in?)
      // Center index 10.
      // 10 - 2.1 = 7.9. So index 8 (center 8.5) is > 7.9?
      // utils.ts logic:
      // center = 10.5
      // x = c - 10.5 + 0.5 = c - 10
      // halfSize = 4.2 / 2 = 2.1
      // abs(c-10) < 2.1 => -2.1 < c-10 < 2.1 => 7.9 < c < 12.1
      // So c = 8, 9, 10, 11, 12 should be covered.

      expect(isCovered(10, 8)).toBe(true);
      expect(isCovered(10, 12)).toBe(true);
      expect(isCovered(10, 7)).toBe(false);
      expect(isCovered(10, 13)).toBe(false);
    });

    it('covers circular area correctly', () => {
      const config: QRConfig = {
          ...DEFAULT_CONFIG,
          logoUrl: 'test.png',
          logoPaddingStyle: 'circle',
          logoSize: 0.2, // ~4.2 modules
          logoPadding: 0
      };

      const metrics = getLogoMetrics(config, moduleCount, cellSize);
      const isCovered = getIsCoveredByLogo(config, moduleCount, metrics);

      // Center
      expect(isCovered(10, 10)).toBe(true);

      // Corners of the bounding box might NOT be covered in circle mode
      // Box is 8..12 (5x5 modules approx?)
      // (12, 12): x=2, y=2. dist^2 = 8. radius^2 = 2.1^2 = 4.41.
      // 8 > 4.41 -> Not covered.
      expect(isCovered(12, 12)).toBe(false);

      // (10, 12): x=2, y=0. dist^2 = 4. radius^2 = 4.41.
      // 4 < 4.41 -> Covered.
      expect(isCovered(10, 12)).toBe(true);
    });
  });

  describe('Alignment Pattern Protection', () => {
    it('verifies alignment coordinate lists match the official QR specification across all standard versions', () => {
      // Version 2: center at (18, 18)
      const centersV2 = getAlignmentPatternCenters(2);
      expect(centersV2).toEqual([{ r: 18, c: 18 }]);

      // Version 7: L = [6, 22, 38]
      // len = 3. Excludes (6,6), (6,38), (38,6).
      // Valid are: (6,22), (22,6), (22,22), (22,38), (38,22), (38,38).
      const centersV7 = getAlignmentPatternCenters(7);
      expect(centersV7).toHaveLength(6);
      expect(centersV7).toContainEqual({ r: 6, c: 22 });
      expect(centersV7).toContainEqual({ r: 22, c: 6 });
      expect(centersV7).toContainEqual({ r: 22, c: 22 });
      expect(centersV7).toContainEqual({ r: 22, c: 38 });
      expect(centersV7).toContainEqual({ r: 38, c: 22 });
      expect(centersV7).toContainEqual({ r: 38, c: 38 });

      // Verifies all versions from 1 to 40 do not throw and have standard behaviors
      for (let v = 1; v <= 40; v++) {
        const centers = getAlignmentPatternCenters(v);
        if (v === 1) {
          expect(centers).toHaveLength(0);
        } else {
          // Version 2+ must have alignment patterns
          expect(centers.length).toBeGreaterThan(0);
          // Standard corners must not be present
          const L = ALIGNMENT_PATTERN_COORDINATES[v];
          const first = L[0];
          const last = L[L.length - 1];
          expect(centers).not.toContainEqual({ r: first, c: first });
          expect(centers).not.toContainEqual({ r: first, c: last });
          expect(centers).not.toContainEqual({ r: last, c: first });
        }
      }
    });

    it('identifies 7x7 alignment pattern zone protection area correctly', () => {
      // For version 2: center at (18, 18)
      // size = 25 for version 2
      const size = 25;
      expect(isAlignmentPatternZone(18, 18, size)).toBe(true);
      expect(isAlignmentPatternZone(15, 15, size)).toBe(true); // boundary edge Math.abs(15 - 18) === 3
      expect(isAlignmentPatternZone(21, 21, size)).toBe(true); // boundary edge Math.abs(21 - 18) === 3
      expect(isAlignmentPatternZone(14, 18, size)).toBe(false); // outside
      expect(isAlignmentPatternZone(18, 22, size)).toBe(false); // outside
      expect(isAlignmentPatternZone(6, 18, size)).toBe(false); // top right is a corner, so not protected by alignment helper (already finder pattern zone)
    });
  });
});
