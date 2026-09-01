import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  escapeMetadata,
  serializeJsonLd,
  validateAndSanitizeUrl,
  validateAndSanitizeOrigin,
  sanitizeCanonicalUrl,
  renderEdgeFallbackHtml,
} from '../src/utils/edgeSecurity';
import { onRequest as catchAllHandler } from '../functions/[[path]]';

describe('Modular Edge Security Helper & Route Sanitization', () => {
  beforeEach(() => {
    (globalThis as any).__edgeCache = new Map();
    (globalThis as any).__mockKV = new Map();
  });

  describe('Unit Tests: escapeMetadata', () => {
    it('escapes HTML entity characters correctly', () => {
      const raw = 'Title <script>alert("xss")</script> & "quotes" \'single\'';
      const expected = 'Title &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;quotes&quot; &#39;single&#39;';
      expect(escapeMetadata(raw)).toBe(expected);
    });

    it('handles undefined, null, and empty input gracefully', () => {
      expect(escapeMetadata(undefined)).toBe('');
      expect(escapeMetadata(null)).toBe('');
      expect(escapeMetadata('')).toBe('');
    });
  });

  describe('Unit Tests: serializeJsonLd', () => {
    it('escapes angle brackets and ampersands using Unicode sequences', () => {
      const obj = {
        title: '</script><script>alert("xss")</script>',
        param: 'a & b',
      };
      const serialized = serializeJsonLd(obj);

      expect(serialized).not.toContain('</script>');
      expect(serialized).toContain('\\u003c/script\\u003e');
      expect(serialized).toContain('\\u0026');

      // Verify strict JSON format compliance
      const parsed = JSON.parse(serialized);
      expect(parsed.title).toBe('</script><script>alert("xss")</script>');
      expect(parsed.param).toBe('a & b');
    });

    it('returns "{}" for invalid, null, or undefined data', () => {
      expect(serializeJsonLd(null)).toBe('{}');
      expect(serializeJsonLd(undefined)).toBe('{}');
    });
  });

  describe('Unit Tests: validateAndSanitizeUrl & validateAndSanitizeOrigin', () => {
    it('validates safe http/https URLs and strips control characters', () => {
      const safe = 'https://qrcraftly.com/r/test-id?param=1';
      expect(validateAndSanitizeUrl(safe)).toBe(safe);
    });

    it('neutralizes dangerous protocol schemes like javascript: or data:', () => {
      const dangerous = 'javascript:alert(1)';
      expect(validateAndSanitizeUrl(dangerous)).toBe('https://qrcraftly.com');
      expect(validateAndSanitizeOrigin('javascript:alert(1)')).toBe('https://qrcraftly.com');
    });

    it('sanitizes canonical URLs for safe HTML attribute interpolation', () => {
      const dirtyUrl = 'https://qrcraftly.com/r/<script>alert(1)</script>';
      const sanitized = sanitizeCanonicalUrl(dirtyUrl);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });
  });

  describe('Unit Tests: renderEdgeFallbackHtml', () => {
    it('renders edge fallback HTML with escaped metadata and Unicode-serialized JSON-LD', () => {
      const html = renderEdgeFallbackHtml({
        pathname: '/r/<script>alert("xss")</script>',
        url: new URL('https://qrcraftly.com/r/<script>alert("xss")</script>'),
        meta: {
          title: 'Unsafe Title <script>',
          description: 'Unsafe Desc "quote"',
        },
      });

      expect(html).not.toContain('<script>alert');
      expect(html).toContain('Unsafe Title &lt;script&gt;');
      expect(html).toContain('Unsafe Desc &quot;quote&quot;');

      // JSON-LD extraction and validation
      const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
      expect(match).not.toBeNull();
      if (match) {
        const jsonLdText = match[1];
        expect(jsonLdText).not.toContain('</script>');
        expect(() => JSON.parse(jsonLdText)).not.toThrow();
      }
    });
  });

  describe('Integration Test: Catch-All Edge Worker Route Sanitization', () => {
    it('neutralizes XSS injection payloads in dynamic URL paths', async () => {
      const payloadPath = '/r/%3Cscript%3Ealert(1)%3C/script%3E';
      const request = new Request(`https://qrcraftly.com${payloadPath}`, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const context = {
        request,
        env: {},
        params: { path: ['r', '<script>alert(1)</script>'] },
        next: vi.fn().mockResolvedValue(new Response('404 Not Found', { status: 404 })),
        waitUntil: vi.fn(),
      };

      const response = await catchAllHandler(context);
      expect(response.status).toBe(200);

      const html = await response.text();
      // Ensure no raw script tag was injected into head markup
      expect(html).not.toContain('href="https://qrcraftly.com/r/<script>');
      expect(html).not.toContain('<script>alert');

      // Extract JSON-LD block and verify syntax
      const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
      expect(match).not.toBeNull();
      if (match) {
        const jsonLdContent = match[1];
        const parsed = JSON.parse(jsonLdContent);
        expect(parsed['@context']).toBe('https://schema.org');
        expect(parsed.url).toBe('https://qrcraftly.com');
      }
    });
  });
});
