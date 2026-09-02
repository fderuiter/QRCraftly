// @vitest-environment jsdom
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTrackedObjectURL,
  revokeTrackedObjectURL,
  revokeAllTrackedObjectURLs,
  calculateAspectBounds,
  parseSvgDimensions,
  probeImageDimensions
} from './imageLoaderUtils';

describe('imageLoaderUtils', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn((blob) => `blob:mock-url-${Math.random()}`);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  describe('Object URL Lifecycle Management', () => {
    it('creates and tracks object URLs', () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      const url = createTrackedObjectURL(blob);
      expect(url).toMatch(/^blob:mock-url-/);
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    });

    it('revokes tracked object URLs synchronously', () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      const url = createTrackedObjectURL(blob);
      revokeTrackedObjectURL(url);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    });

    it('revokes all tracked object URLs', () => {
      const blob1 = new Blob(['1'], { type: 'image/png' });
      const blob2 = new Blob(['2'], { type: 'image/png' });
      const url1 = createTrackedObjectURL(blob1);
      const url2 = createTrackedObjectURL(blob2);

      revokeAllTrackedObjectURLs();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url2);
    });
  });

  describe('calculateAspectBounds', () => {
    it('returns zero dimensions for invalid or negative inputs', () => {
      expect(calculateAspectBounds(0, 0, 100)).toEqual({ width: 0, height: 0, aspectRatio: 1 });
      expect(calculateAspectBounds(-100, 50, 100)).toEqual({ width: 0, height: 0, aspectRatio: 1 });
    });

    it('preserves aspect ratio when downscaling with single maxDim', () => {
      const result = calculateAspectBounds(2000, 1000, 1000);
      expect(result).toEqual({
        width: 1000,
        height: 500,
        aspectRatio: 2
      });
    });

    it('preserves aspect ratio when downscaling with explicit maxWidth and maxHeight bounds', () => {
      const result = calculateAspectBounds(1200, 800, { maxWidth: 600, maxHeight: 600 });
      expect(result).toEqual({
        width: 600,
        height: 400,
        aspectRatio: 1.5
      });
    });

    it('returns original dimensions if image is within max bounds', () => {
      const result = calculateAspectBounds(400, 300, 1000);
      expect(result).toEqual({
        width: 400,
        height: 300,
        aspectRatio: 4 / 3
      });
    });
  });

  describe('parseSvgDimensions', () => {
    it('parses width and height from viewBox attribute', () => {
      const svg = '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"></svg>';
      const result = parseSvgDimensions(svg);
      expect(result).toEqual({
        width: 800,
        height: 600,
        aspectRatio: 800 / 600
      });
    });

    it('parses width and height from explicit width and height attributes', () => {
      const svg = '<svg width="400px" height="200px" xmlns="http://www.w3.org/2000/svg"></svg>';
      const result = parseSvgDimensions(svg);
      expect(result).toEqual({
        width: 400,
        height: 200,
        aspectRatio: 2
      });
    });

    it('returns null if no valid dimensions are present in SVG content', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      expect(parseSvgDimensions(svg)).toBeNull();
    });
  });

  describe('probeImageDimensions', () => {
    let originalImage: typeof window.Image;

    beforeEach(() => {
      originalImage = window.Image;
    });

    afterEach(() => {
      window.Image = originalImage;
    });

    it('probes dimensions for a valid image URL', async () => {
      window.Image = class {
        onload: any = null;
        onerror: any = null;
        naturalWidth = 1920;
        naturalHeight = 1080;
        set src(_val: string) {
          setTimeout(() => this.onload && this.onload(), 0);
        }
      } as any;

      const dims = await probeImageDimensions('http://example.com/test.png');
      expect(dims).toEqual({
        width: 1920,
        height: 1080,
        aspectRatio: 1920 / 1080
      });
    });

    it('probes dimensions for SVG file and revokes object URL cleanly', async () => {
      const svgFile = new File(['<svg viewBox="0 0 100 100"></svg>'], 'icon.svg', { type: 'image/svg+xml' });
      const dims = await probeImageDimensions(svgFile);
      expect(dims).toEqual({
        width: 100,
        height: 100,
        aspectRatio: 1
      });
    });

    it('rejects if image fails to load during probing and cleans up object URL', async () => {
      window.Image = class {
        onload: any = null;
        onerror: any = null;
        set src(_val: string) {
          setTimeout(() => this.onerror && this.onerror(), 0);
        }
      } as any;

      const blob = new Blob(['bad-data'], { type: 'image/png' });
      await expect(probeImageDimensions(blob)).rejects.toThrow('Failed to load image asset for dimension probing');
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
