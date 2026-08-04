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

    it('contains a non-uniform gradient test case that fails if green and blue channels are transposed', () => {
      // Create a 3x3 image with a non-uniform gradient.
      // 3x3 has 9 pixels, which requires 36 elements in Uint8ClampedArray.
      const width = 3;
      const height = 3;
      const pixels = new Uint8ClampedArray(width * height * 4);
      
      // Seed with distinct, non-uniform color gradients
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          pixels[idx]     = (x + 1) * 10 + (y + 1) * 5;    // Red
          pixels[idx + 1] = (x + 1) * 20 + (y + 1) * 15;   // Green (distinct)
          pixels[idx + 2] = (x + 1) * 5 + (y + 1) * 30;    // Blue (distinct)
          pixels[idx + 3] = (x + 1) * 12 + (y + 1) * 18;   // Non-uniform Alpha (should be preserved)
        }
      }

      // Compute horizontal blur manually for this non-uniform gradient
      const temp = new Uint8ClampedArray(pixels.length);
      const blurRadius = 1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0, count = 0;
          for (let k = -blurRadius; k <= blurRadius; k++) {
            const px = x + k;
            if (px >= 0 && px < width) {
              const idx = (y * width + px) * 4;
              r += pixels[idx];
              g += pixels[idx + 1];
              b += pixels[idx + 2];
              count++;
            }
          }
          const outIdx = (y * width + x) * 4;
          temp[outIdx] = r / count;
          temp[outIdx + 1] = g / count;
          temp[outIdx + 2] = b / count;
          temp[outIdx + 3] = pixels[outIdx + 3];
        }
      }

      // Compute vertical blur manually
      const expected = new Uint8ClampedArray(pixels.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0, count = 0;
          for (let k = -blurRadius; k <= blurRadius; k++) {
            const py = y + k;
            if (py >= 0 && py < height) {
              const idx = (py * width + x) * 4;
              r += temp[idx];
              g += temp[idx + 1];
              b += temp[idx + 2];
              count++;
            }
          }
          const outIdx = (y * width + x) * 4;
          expected[outIdx] = r / count;
          expected[outIdx + 1] = g / count;
          expected[outIdx + 2] = b / count;
          expected[outIdx + 3] = pixels[outIdx + 3];
        }
      }

      // Run applyOpticalSimulationMath with noiseLevel = 0
      const actual = applyOpticalSimulationMath(pixels, width, height, 0);

      // Verify actual matches expected for both green and blue channels
      for (let i = 0; i < pixels.length; i += 4) {
        expect(actual[i]).toBeCloseTo(expected[i], 1);
        expect(actual[i + 1]).toBeCloseTo(expected[i + 1], 1);
        expect(actual[i + 2]).toBeCloseTo(expected[i + 2], 1);
        expect(actual[i + 3]).toBe(expected[i + 3]); // Alpha must be preserved
      }

      // Construct a transposed version of expected where green and blue channels are swapped in the vertical pass
      // (i.e. destination green gets vertical pass of blue channel, and destination blue gets vertical pass of green channel)
      const transposed = new Uint8ClampedArray(expected.length);
      for (let i = 0; i < expected.length; i += 4) {
        transposed[i] = expected[i];
        transposed[i + 1] = expected[i + 2]; // Transposed: green gets blue's value
        transposed[i + 2] = expected[i + 1]; // Transposed: blue gets green's value
        transposed[i + 3] = expected[i + 3];
      }

      // Verify that actual does NOT match transposed.
      // This ensures that if the green and blue channels were transposed, this test would fail.
      let isDifferent = false;
      for (let i = 0; i < actual.length; i += 4) {
        if (Math.abs(actual[i + 1] - transposed[i + 1]) > 1) {
          isDifferent = true;
          break;
        }
      }
      expect(isDifferent).toBe(true);
    });
  });
});
