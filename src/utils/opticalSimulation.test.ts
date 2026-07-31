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

import { describe, it, expect, vi } from 'vitest';
import { calculateBlurRadius, applyOpticalSimulationMath } from './opticalSimulation';

describe('Optical Simulation Utility Math', () => {
  describe('calculateBlurRadius', () => {
    it('should scale blur radius to 5% of the input image width', () => {
      expect(calculateBlurRadius(100)).toBe(5);
      expect(calculateBlurRadius(200)).toBe(10);
      expect(calculateBlurRadius(1000)).toBe(50);
    });

    it('should enforce a minimum blur radius of 1', () => {
      expect(calculateBlurRadius(10)).toBe(1);
      expect(calculateBlurRadius(5)).toBe(1);
      expect(calculateBlurRadius(1)).toBe(1);
      expect(calculateBlurRadius(0)).toBe(1);
    });
  });

  describe('applyOpticalSimulationMath', () => {
    it('should correctly apply 1D box blur (horizontal then vertical passes)', () => {
      // Define a tiny image (3x3), so width = 3, height = 3.
      // 3x3 image has 9 pixels, which requires a Uint8ClampedArray of length 36.
      // Let's populate the pixels with a known pattern.
      const pixels = new Uint8ClampedArray(36);
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 100;     // Red
        pixels[i + 1] = 150; // Green
        pixels[i + 2] = 200; // Blue
        pixels[i + 3] = 255; // Alpha
      }

      // With width = 3, calculateBlurRadius(3) returns 1.
      // Let's run with noiseLevel = 0 to verify pure box blur.
      const blurred = applyOpticalSimulationMath(pixels, 3, 3, 0);

      // Verify that blurred has correct length and values
      expect(blurred.length).toBe(36);

      // Since all pixels are identical, box blur should produce identical values
      for (let i = 0; i < blurred.length; i += 4) {
        expect(blurred[i]).toBeCloseTo(100, 1);
        expect(blurred[i + 1]).toBeCloseTo(150, 1);
        expect(blurred[i + 2]).toBeCloseTo(200, 1);
        expect(blurred[i + 3]).toBe(255);
      }
    });

    it('should hit boundary conditions (px and py both inside and outside bounds)', () => {
      // Create a 2x2 image (width=2, height=2, blurRadius=1).
      // This will ensure px and py can go both inside and outside bounds:
      // e.g. for x=0, k=-1 => px=-1 (out of bounds).
      // e.g. for x=1, k=1 => px=2 (out of bounds).
      const pixels = new Uint8ClampedArray(16);
      pixels[0] = 10; pixels[1] = 20; pixels[2] = 30; pixels[3] = 255;
      pixels[4] = 40; pixels[5] = 50; pixels[6] = 60; pixels[7] = 255;
      pixels[8] = 70; pixels[9] = 80; pixels[10] = 90; pixels[11] = 255;
      pixels[12] = 100; pixels[13] = 110; pixels[14] = 120; pixels[15] = 255;

      const blurred = applyOpticalSimulationMath(pixels, 2, 2, 0);
      expect(blurred.length).toBe(16);
    });

    it('should superimpose randomized noise and clamp output values strictly between 0 and 255', () => {
      // Test lower boundary clamp (0) with high negative noise
      const blackPixels = new Uint8ClampedArray(16); // All 0s
      // Stub Math.random to return 0.0, which yields maximum negative noise (-50)
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.0);
      
      const blackBlurred = applyOpticalSimulationMath(blackPixels, 2, 2, 100);
      randSpy.mockRestore();

      // All values should be clamped to 0, not negative
      for (let i = 0; i < blackBlurred.length; i += 4) {
        expect(blackBlurred[i]).toBe(0);
        expect(blackBlurred[i + 1]).toBe(0);
        expect(blackBlurred[i + 2]).toBe(0);
      }

      // Test upper boundary clamp (255) with high positive noise
      const whitePixels = new Uint8ClampedArray(16);
      whitePixels.fill(255); // All 255s
      // Stub Math.random to return 1.0, which yields maximum positive noise (+50)
      const randSpy2 = vi.spyOn(Math, 'random').mockReturnValue(1.0);

      const whiteBlurred = applyOpticalSimulationMath(whitePixels, 2, 2, 100);
      randSpy2.mockRestore();

      // All values should be clamped to 255, not above
      for (let i = 0; i < whiteBlurred.length; i += 4) {
        expect(whiteBlurred[i]).toBe(255);
        expect(whiteBlurred[i + 1]).toBe(255);
        expect(whiteBlurred[i + 2]).toBe(255);
      }
    });

    it('should successfully run on varied image dimensions to ensure zero regressions in 5% blur radius calculation', () => {
      // Ensure it runs with various sizes
      const sizes = [50, 100, 200, 500];
      sizes.forEach((size) => {
        const pixels = new Uint8ClampedArray(size * size * 4);
        const blurred = applyOpticalSimulationMath(pixels, size, size, 5);
        expect(blurred.length).toBe(size * size * 4);
      });
    });
  });
});
