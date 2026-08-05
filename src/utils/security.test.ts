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
// @ts-expect-error - jsdom type declarations might not be installed
import { JSDOM } from 'jsdom';

if (typeof globalThis.DOMParser === 'undefined') {
  const dom = new JSDOM();
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.XMLSerializer = dom.window.XMLSerializer;
  globalThis.Node = dom.window.Node;
}

import { isDangerousUrl, safeJsonLdStringify, cleanPhoneNumber, sanitizeInput, validateImageUpload, sanitizeSvg } from './security';

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

  describe('sanitizeSvg', () => {
      it('removes script blocks completely', () => {
          const raw = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script><rect width="100" height="100" /></svg>`;
          const cleaned = sanitizeSvg(raw);
          expect(cleaned).not.toContain('<script>');
          expect(cleaned).not.toContain('alert');
          expect(cleaned).toContain('rect');
      });

      it('removes inline script events', () => {
          const raw = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" onload="alert(1)" onclick="something()" /></svg>`;
          const cleaned = sanitizeSvg(raw);
          expect(cleaned).not.toContain('onload');
          expect(cleaned).not.toContain('onclick');
          expect(cleaned).toContain('rect');
      });

      it('removes external resource requests from href and xlink:href', () => {
          const raw = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image href="https://example.com/malicious.png" xlink:href="http://attacker.com/evil.png" /><image href="data:image/png;base64,abc" xlink:href="#local-ref" /></svg>`;
          const cleaned = sanitizeSvg(raw);
          expect(cleaned).not.toContain('https://example.com/malicious.png');
          expect(cleaned).not.toContain('http://attacker.com/evil.png');
          expect(cleaned).toContain('data:image/png;base64,abc');
          expect(cleaned).toContain('#local-ref');
      });

      it('sanitizes inline styles and style elements for external resource requests', () => {
          const raw = `<svg xmlns="http://www.w3.org/2000/svg"><style>@import "https://attacker.com/style.css"; rect { fill: url(http://malicious.com/image.png); filter: url(#safe-filter); }</style><rect style="background: url('https://evil.com'); filter: url(#another-safe);" /></svg>`;
          const cleaned = sanitizeSvg(raw);
          expect(cleaned).not.toContain('https://attacker.com/style.css');
          expect(cleaned).not.toContain('http://malicious.com/image.png');
          expect(cleaned).not.toContain('https://evil.com');
          expect(cleaned).toContain('url(#safe-filter)');
          expect(cleaned).toContain('url(#another-safe)');
      });

      it('preserves presentation attributes, clip paths, linear gradients, and viewBox', () => {
          const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="red" stroke="blue"><defs><linearGradient id="g1"><stop offset="0%" stop-color="red" /></linearGradient><clipPath id="c1"><circle cx="50" cy="50" r="40" /></clipPath></defs></svg>`;
          const cleaned = sanitizeSvg(raw);
          expect(cleaned).toContain('viewBox="0 0 100 100"');
          expect(cleaned).toContain('fill="red"');
          expect(cleaned).toContain('stroke="blue"');
          expect(cleaned).toContain('linearGradient');
          expect(cleaned).toContain('clipPath');
      });
  });

