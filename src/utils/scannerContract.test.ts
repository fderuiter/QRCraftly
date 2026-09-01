import { describe, it, expect } from 'vitest';
import {
  isValidScannerRequest,
  assertScannerRequest,
  isValidScannerResponse,
  assertScannerResponse,
  getDownscaledDimensions,
  computeAspectFit,
} from './scannerContract';

if (typeof (globalThis as any).ImageBitmap === 'undefined') {
  (globalThis as any).ImageBitmap = class ImageBitmap {
    width: number;
    height: number;
    constructor(width = 100, height = 100) {
      this.width = width;
      this.height = height;
    }
    close() {}
  };
}

describe('Scanner Contract Payload Validation', () => {
  describe('isValidScannerRequest', () => {
    it('should validate valid scanner requests', () => {
      const valid = {
        image: new (ImageBitmap as any)(100, 100),
        width: 100,
        height: 100,
        sequenceId: 5,
      };
      expect(isValidScannerRequest(valid)).toBe(true);
      expect(() => assertScannerRequest(valid)).not.toThrow();
    });

    it('should invalidate invalid scanner requests', () => {
      const missingImage = {
        width: 100,
        height: 100,
        sequenceId: 5,
      };
      const invalidWidth = {
        image: new (ImageBitmap as any)(100, 100),
        width: -10,
        height: 100,
        sequenceId: 5,
      };
      const invalidSeq = {
        image: new (ImageBitmap as any)(100, 100),
        width: 100,
        height: 100,
        sequenceId: NaN,
      };

      expect(isValidScannerRequest(missingImage)).toBe(false);
      expect(isValidScannerRequest(invalidWidth)).toBe(false);
      expect(isValidScannerRequest(invalidSeq)).toBe(false);

      expect(() => assertScannerRequest(missingImage)).toThrow();
      expect(() => assertScannerRequest(invalidWidth)).toThrow();
    });
  });

  describe('isValidScannerResponse', () => {
    it('should validate valid scanner responses', () => {
      const validPass = {
        status: 'pass' as const,
        sequenceId: 4,
        decodedData: 'https://qrcraftly.com',
      };
      const validFail = {
        status: 'fail' as const,
        sequenceId: 4,
        error: 'DECODE_ERROR',
      };

      expect(isValidScannerResponse(validPass)).toBe(true);
      expect(isValidScannerResponse(validFail)).toBe(true);
      expect(() => assertScannerResponse(validPass)).not.toThrow();
      expect(() => assertScannerResponse(validFail)).not.toThrow();
    });

    it('should invalidate invalid scanner responses', () => {
      const missingStatus = {
        sequenceId: 4,
      };
      const invalidStatus = {
        status: 'unknown',
        sequenceId: 4,
      };

      expect(isValidScannerResponse(missingStatus)).toBe(false);
      expect(isValidScannerResponse(invalidStatus)).toBe(false);

      expect(() => assertScannerResponse(missingStatus)).toThrow();
    });
  });

  describe('Aspect Ratio Utilities', () => {
    it('getDownscaledDimensions scales dimensions within max limits', () => {
      const scaled = getDownscaledDimensions(1920, 1080, 1280);
      expect(scaled.width).toBe(1280);
      expect(scaled.height).toBe(720);
    });

    it('computeAspectFit calculates crop and fit bounds', () => {
      const fit = computeAspectFit(1920, 1080, 1280);
      expect(fit.width).toBe(1280);
      expect(fit.height).toBe(720);
      expect(fit.crop).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
    });
  });
});
