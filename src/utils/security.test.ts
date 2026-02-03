import { describe, it, expect } from 'vitest';
import { isDangerousUrl, safeJsonLdStringify, cleanPhoneNumber } from './security';

describe('Security Utils', () => {
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

    it('returns false for undefined url', () => {
      expect(isDangerousUrl(undefined)).toBe(false);
    });
  });

  describe('safeJsonLdStringify', () => {
    it('serializes simple object', () => {
      const data = { name: 'Test', value: 123 };
      expect(safeJsonLdStringify(data)).toBe('{"name":"Test","value":123}');
    });

    it('escapes <, >, and & characters', () => {
        const data = {
            malicious: '<script>alert("xss")</script> & more'
        };
        const result = safeJsonLdStringify(data);
        expect(result).toContain('\\u003cscript\\u003ealert(\\"xss\\")\\u003c/script\\u003e');
        expect(result).toContain('\\u0026');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).not.toContain('&');
    });
  });

  describe('cleanPhoneNumber', () => {
    it('removes spaces and colons', () => {
      expect(cleanPhoneNumber('123 456:789')).toBe('123456789');
    });

    it('allows valid phone characters', () => {
      expect(cleanPhoneNumber('+1(555)123-4567')).toBe('+1(555)123-4567');
      expect(cleanPhoneNumber('*#06#')).toBe('*#06#');
      expect(cleanPhoneNumber('123,456')).toBe('123,456');
    });

    it('strips dangerous characters and letters', () => {
      // 123?body=evil -> 123
      expect(cleanPhoneNumber('123?body=evil')).toBe('123');
      // 123;phone-context=evil -> 123-
      expect(cleanPhoneNumber('123;phone-context=evil')).toBe('123-');
      // 123&other=param -> 123
      expect(cleanPhoneNumber('123&other=param')).toBe('123');
    });

    it('strips letters (vanity numbers)', () => {
      expect(cleanPhoneNumber('1-800-FLOWERS')).toBe('1-800-');
    });
  });
});
