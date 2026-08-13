import { describe, it, expect } from 'vitest';
import {
  isValidScannerRequest,
  assertScannerRequest,
  isValidScannerResponse,
  assertScannerResponse,
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
        image: new ImageBitmap(100, 100),
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
        image: new ImageBitmap(100, 100),
        width: -10,
        height: 100,
        sequenceId: 5,
      };
      const invalidSeq = {
        image: new ImageBitmap(100, 100),
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
});
