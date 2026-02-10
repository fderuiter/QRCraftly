import { describe, it, expect } from 'vitest';
import { isDangerousUrl, safeJsonLdStringify, cleanPhoneNumber, sanitizeInput } from './security';

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

    it('detects blob: protocol', () => {
      expect(isDangerousUrl('blob:https://example.com/uuid')).toBe(true);
    });

    it('detects filesystem: protocol', () => {
      expect(isDangerousUrl('filesystem:http://example.com/temporary/')).toBe(true);
    });

    it('detects legacy scripting protocols', () => {
      expect(isDangerousUrl('jscript:alert(1)')).toBe(true);
      expect(isDangerousUrl('wscript:alert(1)')).toBe(true);
      expect(isDangerousUrl('mocha:alert(1)')).toBe(true);
    });

    it('detects about: protocol', () => {
      expect(isDangerousUrl('about:blank')).toBe(true);
    });

    it('detects protocols with leading whitespace or control characters', () => {
      expect(isDangerousUrl('  javascript:alert(1)')).toBe(true);
      expect(isDangerousUrl('\njavascript:alert(1)')).toBe(true);
      // \x00 null byte
      expect(isDangerousUrl('\x00javascript:alert(1)')).toBe(true);
    });

    it('detects zero-width characters bypass attempts', () => {
      // Zero Width Space \u200B
      expect(isDangerousUrl('java\u200Bscript:alert(1)')).toBe(true);
      // Zero Width Non-Joiner \u200C
      expect(isDangerousUrl('java\u200Cscript:alert(1)')).toBe(true);
      // Zero Width Joiner \u200D
      expect(isDangerousUrl('java\u200Dscript:alert(1)')).toBe(true);
      // Zero Width No-Break Space \uFEFF
      expect(isDangerousUrl('java\uFEFFscript:alert(1)')).toBe(true);
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

      it('removes URI control characters', () => {
          expect(cleanPhoneNumber('123?body=hacked')).toBe('123bodyhacked');
          expect(cleanPhoneNumber('123&foo=bar')).toBe('123foobar');
      });
  });

  describe('sanitizeInput', () => {
      it('strips query parameters', () => {
          expect(sanitizeInput('test@example.com?foo=bar')).toBe('test@example.com');
          expect(sanitizeInput('bitcoin:addr?amount=1')).toBe('bitcoin:addr');
      });

      it('returns original string if no query parameters', () => {
          expect(sanitizeInput('test@example.com')).toBe('test@example.com');
      });

      it('returns empty string if input is empty', () => {
          expect(sanitizeInput('')).toBe('');
      });
  });
});
