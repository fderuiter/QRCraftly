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
import { isEye, calculateLayout, getLogoMetrics, getIsCoveredByLogo } from './utils';
import { DEFAULT_CONFIG } from '../../constants';
import { QRConfig } from '../../types';

describe('QR Renderer Utils', () => {
  describe('isEye', () => {
    it('identifies top-left eye', () => {
      expect(isEye(0, 0, 21)).toBe(true);
      expect(isEye(6, 6, 21)).toBe(true);
      expect(isEye(0, 6, 21)).toBe(true);
      expect(isEye(6, 0, 21)).toBe(true);
    });

    it('identifies top-right eye', () => {
      // moduleCount - 7 = 14
      expect(isEye(0, 14, 21)).toBe(true);
      expect(isEye(6, 20, 21)).toBe(true);
      expect(isEye(0, 20, 21)).toBe(true);
      expect(isEye(6, 14, 21)).toBe(true);
    });

    it('identifies bottom-left eye', () => {
      // moduleCount - 7 = 14
      expect(isEye(14, 0, 21)).toBe(true);
      expect(isEye(20, 6, 21)).toBe(true);
      expect(isEye(14, 6, 21)).toBe(true);
      expect(isEye(20, 0, 21)).toBe(true);
    });

    it('does not identify bottom-right as eye (alignment pattern area)', () => {
      expect(isEye(14, 14, 21)).toBe(false);
      expect(isEye(20, 20, 21)).toBe(false);
    });

    it('does not identify middle area as eye', () => {
      expect(isEye(10, 10, 21)).toBe(false);
    });
  });

  describe('calculateLayout', () => {
    it('calculates layout without border', () => {
      const config = { ...DEFAULT_CONFIG, isBorderEnabled: false };
      const result = calculateLayout(config, 100, 25);
      expect(result).toEqual({
        drawX: 0,
        drawY: 0,
        drawSize: 100,
        cellSize: 4,
        borderPx: 0
      });
    });

    it('calculates layout with border', () => {
      const config = { ...DEFAULT_CONFIG, isBorderEnabled: true, borderSize: 0.1 };
      const result = calculateLayout(config, 100, 20);
      // Border is 10% of 100 = 10px
      // drawSize = 100 - (10*2) = 80
      // cellSize = 80 / 20 = 4
      expect(result).toEqual({
        drawX: 10,
        drawY: 10,
        drawSize: 80,
        cellSize: 4,
        borderPx: 10
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
        errorCorrectionLevel: 'H' // Safe ratio 0.50
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
        errorCorrectionLevel: 'L' // Safe ratio 0.22
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
            errorCorrectionLevel: 'M'
        };

        // Requested total cutout: 8.3 modules
        // Max allowed: 7.35 modules
        // Scale factor: 7.35 / 8.3 ≈ 0.8855

        const metrics = getLogoMetrics(config, moduleCount, cellSize);
        expect(metrics.cutoutModuleSize).toBeCloseTo(7.35);
        // Padding should also be scaled
        expect(metrics.effectivePaddingModules).toBeLessThan(1);
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
});
