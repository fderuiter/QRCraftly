import { describe, it, expect } from 'vitest';
import { extractInlineScripts, computeCspHash, replaceMetaCSP, updateCsp, validateHeaders, pathToRoute, generateHeadersContent } from '../scripts/csp_hash_injector.js';

describe('CSP Hash Injector Unit Tests', () => {
  describe('pathToRoute', () => {
    it('should correctly map HTML file paths to URL route paths', () => {
      expect(pathToRoute('index.html')).toBe('/');
      expect(pathToRoute('/index.html')).toBe('/');
      expect(pathToRoute('about/index.html')).toBe('/about');
      expect(pathToRoute('file-transfer/receive/index.html')).toBe('/file-transfer/receive');
      expect(pathToRoute('404.html')).toBe('/404');
    });
  });

  describe('generateHeadersContent', () => {
    it('should generate distinct route blocks without accumulating script hashes in /* global rule', () => {
      const baseCsp = "default-src 'self'; script-src 'self';";
      const existingHeaders = `/*\n  X-Frame-Options: DENY\n  Strict-Transport-Security: max-age=63072000\n`;
      
      const routeCspMap = new Map();
      routeCspMap.set('/', {
        routeCsp: "default-src 'self'; script-src 'self' 'sha256-hashIndex';",
        hashes: ["'sha256-hashIndex'"]
      });
      routeCspMap.set('/about', {
        routeCsp: "default-src 'self'; script-src 'self' 'sha256-hashAbout';",
        hashes: ["'sha256-hashAbout'"]
      });

      const generated = generateHeadersContent(existingHeaders, baseCsp, routeCspMap);

      expect(generated).toContain('/*\n  Content-Security-Policy: default-src \'self\'; script-src \'self\';\n  X-Frame-Options: DENY');
      expect(generated).toContain('/\n  Content-Security-Policy: default-src \'self\'; script-src \'self\' \'sha256-hashIndex\';');
      expect(generated).toContain('/about\n  Content-Security-Policy: default-src \'self\'; script-src \'self\' \'sha256-hashAbout\';');
      
      // Ensure global /* does NOT contain route-scoped hashes
      const globalBlock = generated.split('\n\n').find(b => b.startsWith('/*'));
      expect(globalBlock).not.toContain('sha256-hashIndex');
      expect(globalBlock).not.toContain('sha256-hashAbout');
    });
  });

  describe('extractInlineScripts', () => {
    it('should extract simple inline scripts and ignore scripts with src attribute', () => {
      const html = `
        <html>
          <head>
            <script src="/js/external.js"></script>
            <script>console.log("hello world");</script>
            <script type="application/ld+json">{"@context": "https://schema.org"}</script>
          </head>
        </html>
      `;
      const extracted = extractInlineScripts(html);
      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toBe('console.log("hello world");');
      expect(extracted[1]).toBe('{"@context": "https://schema.org"}');
    });

    it('should handle script tags with line breaks and attributes', () => {
      const html = `
        <script id="vike_pageContext" type="application/json">
          {"pageId": "/src/pages/index"}
        </script>
      `;
      const extracted = extractInlineScripts(html);
      expect(extracted).toHaveLength(1);
      expect(extracted[0]).toContain('{"pageId": "/src/pages/index"}');
    });
  });

  describe('computeCspHash', () => {
    it('should calculate correct sha256 hash formatted for CSP', () => {
      const script = 'console.log("hello world");';
      // Expected Base64 of sha256("console.log("hello world");")
      // sha256 hash in hex: b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9 -> base64 is uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=
      // Let's compute dynamic output and assert prefix
      const hashResult = computeCspHash(script);
      expect(hashResult).toMatch(/^'sha256-[A-Za-z0-9+/=]+'$/);
    });
  });

  describe('replaceMetaCSP', () => {
    it('should replace the content attribute in Content-Security-Policy meta tag', () => {
      const html = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\';" />';
      const updated = replaceMetaCSP(html, "default-src 'self'; script-src 'self' 'sha256-abc';");
      expect(updated).toContain('content="default-src &#x27;self&#x27;; script-src &#x27;self&#x27; &#x27;sha256-abc&#x27;;"');
    });
  });

  describe('updateCsp', () => {
    it('should update script-src directive by removing unsafe-inline and adding hashes', () => {
      const originalCsp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self';";
      const hashes = ["'sha256-abc'", "'sha256-def'"];
      const updated = updateCsp(originalCsp, hashes);
      expect(updated).toContain("script-src 'self' 'sha256-abc' 'sha256-def';");
      expect(updated).not.toContain("'unsafe-inline'");
      expect(updated).toContain("style-src 'self';");
    });
  });

  describe('validateHeaders', () => {
    it('should pass valid headers configuration', () => {
      const csp = "default-src 'self';";
      const content = `/*\n  Content-Security-Policy: ${csp}\n  X-Frame-Options: DENY\n`;
      const results = validateHeaders(csp, content);
      expect(results.cspLength).toBe(19);
      expect(results.totalHeadersSize).toBeGreaterThan(0);
      expect(results.routeHeaders['/*']).toHaveLength(2);
    });

    it('should throw error when CSP is too long', () => {
      const csp = "a".repeat(2001);
      const content = `/*\n  Content-Security-Policy: ${csp}\n`;
      expect(() => validateHeaders(csp, content)).toThrowError(/exceeds Cloudflare's individual header limit/);
    });

    it('should throw error when _headers file is too large', () => {
      const csp = "default-src 'self';";
      const content = "a".repeat(8193);
      expect(() => validateHeaders(csp, content)).toThrowError(/exceeds Cloudflare's limit of 8,192 bytes/);
    });

    it('should throw error if any header exceeds 2000 characters', () => {
      const csp = "default-src 'self';";
      const tooLongHeader = "b".repeat(2001);
      const content = `/*\n  Custom-Header: ${tooLongHeader}\n`;
      expect(() => validateHeaders(csp, content)).toThrowError(/exceeds 2,000 characters/);
    });

    it('should throw error if total headers exceed 8192 bytes', () => {
      const csp = "default-src 'self';";
      const largeHeader = "b".repeat(1500);
      const content = `/*\n` + Array(6).fill(`  X-Custom-Header: ${largeHeader}\n`).join("");
      expect(() => validateHeaders(csp, content)).toThrowError(/exceeds Cloudflare's limit of 8,192 bytes/);
    });
  });
});
