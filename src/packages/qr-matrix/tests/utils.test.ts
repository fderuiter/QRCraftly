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
import {
  calculateLayout,
  getLogoMetrics,
  getIsCoveredByLogo,
  getAlignmentPatternCenters,
  isAlignmentPatternZone,
  ALIGNMENT_PATTERN_COORDINATES,
} from '../index';
import { DEFAULT_CONFIG } from '@/constants';
import { QRConfig, QRErrorCorrectionLevel } from '@/types';

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
    const moduleCount = 21;

    it('calculates metrics for logo within safe limits', () => {
      const config: QRConfig = {
        ...DEFAULT_CONFIG,
        logoSize: 0.2,
        logoPadding: 0,
        logoPaddingStyle: 'none',
        errorCorrectionLevel: QRErrorCorrectionLevel.H
      };

      const metrics = getLogoMetrics(config, moduleCount, cellSize);

      expect(metrics.effectiveLogoSizeModules).toBeCloseTo(4.2);
      expect(metrics.logoSizePx).toBeCloseTo(42);
      expect(metrics.effectivePaddingModules).toBe(0);
    });

    it('scales down logo if it exceeds safe limit for Low error correction', () => {
      const config: QRConfig = {
        ...DEFAULT_CONFIG,
        logoSize: 0.3,
        logoPadding: 0,
        logoPaddingStyle: 'none',
        errorCorrectionLevel: QRErrorCorrectionLevel.L
      };

      const metrics = getLogoMetrics(config, moduleCount, cellSize);
      expect(metrics.effectiveLogoSizeModules).toBeCloseTo(4.62);
      expect(metrics.cutoutModuleSize).toBeCloseTo(4.62);
    });

    it('scales down logo considering padding', () => {
      const config: QRConfig = {
        ...DEFAULT_CONFIG,
        logoSize: 0.3,
        logoPadding: 1,
        logoPaddingStyle: 'square',
        errorCorrectionLevel: QRErrorCorrectionLevel.M
      };

      const metrics = getLogoMetrics(config, moduleCount, cellSize);
      expect(metrics.cutoutModuleSize).toBeCloseTo(7.35);
      expect(metrics.effectivePaddingModules).toBeLessThan(1);
    });

    it('defaults to 0.50 safe area ratio for invalid error correction levels', () => {
      const config: any = {
        ...DEFAULT_CONFIG,
        logoSize: 0.4,
        logoPadding: 0,
        logoPaddingStyle: 'none',
        errorCorrectionLevel: 'INVALID'
      };

      const metrics = getLogoMetrics(config, moduleCount, cellSize);
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

      expect(isCovered(10, 10)).toBe(false);
    });

    it('covers square area correctly', () => {
      const config: QRConfig = {
        ...DEFAULT_CONFIG,
        logoUrl: 'test.png',
        logoPaddingStyle: 'square',
        logoSize: 0.2,
        logoPadding: 0
      };

      const metrics = getLogoMetrics(config, moduleCount, cellSize);
      const isCovered = getIsCoveredByLogo(config, moduleCount, metrics);

      expect(isCovered(10, 10)).toBe(true);
      expect(isCovered(0, 0)).toBe(false);
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
        logoSize: 0.2,
        logoPadding: 0
      };

      const metrics = getLogoMetrics(config, moduleCount, cellSize);
      const isCovered = getIsCoveredByLogo(config, moduleCount, metrics);

      expect(isCovered(10, 10)).toBe(true);
      expect(isCovered(12, 12)).toBe(false);
      expect(isCovered(10, 12)).toBe(true);
    });
  });

  describe('Alignment Pattern Protection', () => {
    it('verifies alignment coordinate lists match the official QR specification across all standard versions', () => {
      const centersV2 = getAlignmentPatternCenters(2);
      expect(centersV2).toEqual([{ r: 18, c: 18 }]);

      const centersV7 = getAlignmentPatternCenters(7);
      expect(centersV7).toHaveLength(6);
      expect(centersV7).toContainEqual({ r: 6, c: 22 });
      expect(centersV7).toContainEqual({ r: 22, c: 6 });
      expect(centersV7).toContainEqual({ r: 22, c: 22 });
      expect(centersV7).toContainEqual({ r: 22, c: 38 });
      expect(centersV7).toContainEqual({ r: 38, c: 22 });
      expect(centersV7).toContainEqual({ r: 38, c: 38 });

      for (let v = 1; v <= 40; v++) {
        const centers = getAlignmentPatternCenters(v);
        if (v === 1) {
          expect(centers).toHaveLength(0);
        } else {
          expect(centers.length).toBeGreaterThan(0);
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
      const size = 25;
      expect(isAlignmentPatternZone(18, 18, size)).toBe(true);
      expect(isAlignmentPatternZone(15, 15, size)).toBe(true);
      expect(isAlignmentPatternZone(21, 21, size)).toBe(true);
      expect(isAlignmentPatternZone(14, 18, size)).toBe(false);
      expect(isAlignmentPatternZone(18, 22, size)).toBe(false);
      expect(isAlignmentPatternZone(6, 18, size)).toBe(false);
    });
  });
});

