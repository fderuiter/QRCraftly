import { describe, it, expect } from 'vitest';
import {
  isValidScannerRequest,
  assertScannerRequest,
  isValidScannerResponse,
  assertScannerResponse,
} from './scannerContract';

describe('Scanner Contract Payload Validation', () => {
  describe('isValidScannerRequest', () => {
    it('should validate valid scanner requests', () => {
      const valid = {
        buffer: new ArrayBuffer(10),
        width: 100,
        height: 100,
        sequenceId: 5,
      };
      expect(isValidScannerRequest(valid)).toBe(true);
      expect(() => assertScannerRequest(valid)).not.toThrow();
    });

    it('should invalidate invalid scanner requests', () => {
      const missingBuffer = {
        width: 100,
        height: 100,
        sequenceId: 5,
      };
      const invalidWidth = {
        buffer: new ArrayBuffer(10),
        width: -10,
        height: 100,
        sequenceId: 5,
      };
      const invalidSeq = {
        buffer: new ArrayBuffer(10),
        width: 100,
        height: 100,
        sequenceId: NaN,
      };

      expect(isValidScannerRequest(missingBuffer)).toBe(false);
      expect(isValidScannerRequest(invalidWidth)).toBe(false);
      expect(isValidScannerRequest(invalidSeq)).toBe(false);

      expect(() => assertScannerRequest(missingBuffer)).toThrow();
      expect(() => assertScannerRequest(invalidWidth)).toThrow();
    });
  });

  describe('isValidScannerResponse', () => {
    it('should validate valid scanner responses', () => {
      const validPass = {
        status: 'pass' as const,
        sequenceId: 4,
        decodedData: 'https://qrcraftly.com',
        buffer: new ArrayBuffer(10),
      };
      const validFail = {
        status: 'fail' as const,
        sequenceId: 4,
        error: 'DECODE_ERROR',
        buffer: new ArrayBuffer(10),
      };

      expect(isValidScannerResponse(validPass)).toBe(true);
      expect(isValidScannerResponse(validFail)).toBe(true);
      expect(() => assertScannerResponse(validPass)).not.toThrow();
      expect(() => assertScannerResponse(validFail)).not.toThrow();
    });

    it('should invalidate invalid scanner responses', () => {
      const missingStatus = {
        sequenceId: 4,
        buffer: new ArrayBuffer(10),
      };
      const missingBuffer = {
        status: 'pass' as const,
        sequenceId: 4,
      };
      const invalidStatus = {
        status: 'unknown',
        sequenceId: 4,
        buffer: new ArrayBuffer(10),
      };

      expect(isValidScannerResponse(missingStatus)).toBe(false);
      expect(isValidScannerResponse(missingBuffer)).toBe(false);
      expect(isValidScannerResponse(invalidStatus)).toBe(false);

      expect(() => assertScannerResponse(missingStatus)).toThrow();
      expect(() => assertScannerResponse(missingBuffer)).toThrow();
    });
  });
});
