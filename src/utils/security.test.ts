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
import { safeJsonLdStringify, cleanPhoneNumber, validateImageUpload } from './security';
import { ValidationEngine } from '../engine/ValidationEngine';

describe('Security Utils', () => {
  describe('isDangerousUrl', () => {
    it('detects javascript: protocol', () => {
      expect(ValidationEngine.isDangerousUrl('javascript:alert(1)')).toBe(true);
      expect(ValidationEngine.isDangerousUrl('JAVASCRIPT:alert(1)')).toBe(true);
    });

    it('detects vbscript: protocol', () => {
      expect(ValidationEngine.isDangerousUrl('vbscript:alert(1)')).toBe(true);
    });

    it('detects data: protocol', () => {
      expect(ValidationEngine.isDangerousUrl('data:text/html,base64...')).toBe(true);
    });

    it('detects file: protocol', () => {
      expect(ValidationEngine.isDangerousUrl('file:///etc/passwd')).toBe(true);
    });

    it('detects blob: protocol', () => {
      expect(ValidationEngine.isDangerousUrl('blob:https://example.com/uuid')).toBe(true);
    });

    it('detects filesystem: protocol', () => {
      expect(ValidationEngine.isDangerousUrl('filesystem:http://example.com/temporary/')).toBe(true);
    });

    it('detects legacy scripting protocols', () => {
      expect(ValidationEngine.isDangerousUrl('jscript:alert(1)')).toBe(true);
      expect(ValidationEngine.isDangerousUrl('wscript:alert(1)')).toBe(true);
      expect(ValidationEngine.isDangerousUrl('mocha:alert(1)')).toBe(true);
    });

    it('detects about: protocol', () => {
      expect(ValidationEngine.isDangerousUrl('about:blank')).toBe(true);
    });

    it('detects protocols with leading whitespace or control characters', () => {
      expect(ValidationEngine.isDangerousUrl('  javascript:alert(1)')).toBe(true);
      expect(ValidationEngine.isDangerousUrl('\njavascript:alert(1)')).toBe(true);
      // \x00 null byte
      expect(ValidationEngine.isDangerousUrl('\x00javascript:alert(1)')).toBe(true);
    });

    it('detects zero-width characters bypass attempts', () => {
      // Zero Width Space \u200B
      expect(ValidationEngine.isDangerousUrl('java\u200Bscript:alert(1)')).toBe(true);
      // Zero Width Non-Joiner \u200C
      expect(ValidationEngine.isDangerousUrl('java\u200Cscript:alert(1)')).toBe(true);
      // Zero Width Joiner \u200D
      expect(ValidationEngine.isDangerousUrl('java\u200Dscript:alert(1)')).toBe(true);
      // Zero Width No-Break Space \uFEFF
      expect(ValidationEngine.isDangerousUrl('java\uFEFFscript:alert(1)')).toBe(true);
    });

    it('allows safe protocols', () => {
      expect(ValidationEngine.isDangerousUrl('https://example.com')).toBe(false);
      expect(ValidationEngine.isDangerousUrl('http://example.com')).toBe(false);
      expect(ValidationEngine.isDangerousUrl('mailto:user@example.com')).toBe(false);
      expect(ValidationEngine.isDangerousUrl('bitcoin:123')).toBe(false);
    });

    it('returns false for undefined url', () => {
      expect(ValidationEngine.isDangerousUrl(undefined)).toBe(false);
    });
  });

  describe('safeJsonLdStringify', () => {
    it('serializes simple object', () => {
      const data = { name: 'Test', value: 123 };
      expect(safeJsonLdStringify(data)).toBe('{"name":"Test","value":123}');
    });

    it('handles undefined and un-stringifyable inputs gracefully', () => {
      expect(safeJsonLdStringify(undefined)).toBe('{}');
      expect(safeJsonLdStringify(() => {})).toBe('{}');
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

      it('removes URI control characters and non-whitelisted chars', () => {
          expect(cleanPhoneNumber('123?body=hacked')).toBe('123');
          expect(cleanPhoneNumber('123&foo=bar')).toBe('123');
      });

      it('enforces strict whitelist', () => {
         expect(cleanPhoneNumber('1-800-ABC-DEFG')).toBe('1-800--'); // Letters removed
         expect(cleanPhoneNumber('+1 (555) 123-4567')).toBe('+1(555)123-4567');
         expect(cleanPhoneNumber('<script>alert(1)</script>')).toBe('(1)');
         expect(cleanPhoneNumber('123#*')).toBe('123#*');
      });
  });

  describe('sanitizeInput', () => {
      it('strips query parameters', () => {
          expect(ValidationEngine.sanitizeInput('test@example.com?foo=bar')).toBe('test@example.com');
          expect(ValidationEngine.sanitizeInput('bitcoin:addr?amount=1')).toBe('bitcoin:addr');
      });

      it('returns original string if no query parameters', () => {
          expect(ValidationEngine.sanitizeInput('test@example.com')).toBe('test@example.com');
      });

      it('returns empty string if input is empty', () => {
          expect(ValidationEngine.sanitizeInput('')).toBe('');
      });
  });

  describe('validateImageUpload', () => {
      it('returns null for valid file types and sizes', () => {
          const validPng = new File([''], 'test.png', { type: 'image/png' });
          expect(validateImageUpload(validPng)).toBeNull();

          const validJpeg = new File([''], 'test.jpg', { type: 'image/jpeg' });
          expect(validateImageUpload(validJpeg)).toBeNull();

          const validWebp = new File([''], 'test.webp', { type: 'image/webp' });
          expect(validateImageUpload(validWebp)).toBeNull();

          const validSvg = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
          expect(validateImageUpload(validSvg)).toBeNull();
      });

      it('returns error for unsupported file types', () => {
          const invalidGif = new File([''], 'test.gif', { type: 'image/gif' });
          expect(validateImageUpload(invalidGif)).toBe('Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed.');

          const invalidTxt = new File(['text'], 'test.txt', { type: 'text/plain' });
          expect(validateImageUpload(invalidTxt)).toBe('Invalid file type. Only JPEG, PNG, WebP, and SVG are allowed.');
      });

      it('returns error for files larger than 2MB', () => {
          const largeFile = new File([''], 'large.png', { type: 'image/png' });
          Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 + 1 });
          expect(validateImageUpload(largeFile)).toBe('File size exceeds the 2MB limit.');
      });

      it('returns null for files exactly 2MB', () => {
          const borderFile = new File([''], 'border.png', { type: 'image/png' });
          Object.defineProperty(borderFile, 'size', { value: 2 * 1024 * 1024 });
          expect(validateImageUpload(borderFile)).toBeNull();
      });
  });
});
