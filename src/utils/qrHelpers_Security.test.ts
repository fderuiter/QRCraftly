import { describe, it, expect } from 'vitest';
import { constructPaymentString, isDangerousUrl } from './qrHelpers';

describe('qrHelpers Security', () => {
  describe('isDangerousUrl', () => {
    it('detects javascript: protocol', () => {
      expect(isDangerousUrl('javascript:alert(1)')).toBe(true);
      expect(isDangerousUrl('JAVASCRIPT:alert(1)')).toBe(true);
    });

    it('detects vbscript: protocol', () => {
      expect(isDangerousUrl('vbscript:alert(1)')).toBe(true);
    });

    it('detects data: protocol', () => {
      expect(isDangerousUrl('data:text/html,base64...')).toBe(true);
    });

    it('detects file: protocol', () => {
      expect(isDangerousUrl('file:///etc/passwd')).toBe(true);
    });

    it('detects protocols with leading whitespace or control characters', () => {
      expect(isDangerousUrl('  javascript:alert(1)')).toBe(true);
      expect(isDangerousUrl('\njavascript:alert(1)')).toBe(true);
      // \x00 null byte
      expect(isDangerousUrl('\x00javascript:alert(1)')).toBe(true);
    });

    it('allows safe protocols', () => {
      expect(isDangerousUrl('https://example.com')).toBe(false);
      expect(isDangerousUrl('http://example.com')).toBe(false);
      expect(isDangerousUrl('mailto:user@example.com')).toBe(false);
      expect(isDangerousUrl('bitcoin:123')).toBe(false);
    });
  });

  describe('constructPaymentString', () => {
    it('blocks dangerous schemes in custom network', () => {
      const dangerousPayload = 'javascript:alert(1)';
      const result = constructPaymentString({
        network: 'custom',
        address: dangerousPayload,
        amount: '',
        label: ''
      });
      expect(result).toBe('');
    });

    it('allows valid custom URIs', () => {
      const validPayload = 'bitcoin:123?amount=10';
      const result = constructPaymentString({
        network: 'custom',
        address: validPayload,
        amount: '',
        label: ''
      });
      expect(result).toBe(validPayload);
    });

    it('constructPaymentString allows parameter injection in custom network if protocol is safe', () => {
      // This is expected behavior for "custom" network - user controls the full string
      // but we ensure it doesn't start with javascript:
      const payload = 'bitcoin:123?amount=100&label=Hack';
      const result = constructPaymentString({
        network: 'custom',
        address: payload,
        amount: '',
        label: ''
      });
      expect(result).toBe(payload);
    });
  });
});
