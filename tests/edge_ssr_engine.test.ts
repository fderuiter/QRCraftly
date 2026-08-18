import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onRequest as catchAllHandler } from '../functions/[[path]]';
import { onRequestPost as updateRedirectHandler } from '../functions/api/redirect/update';
import { onRequestPost as registerRedirectHandler } from '../functions/api/redirect/register';

describe('Universal Edge SSR Engine', () => {
  beforeEach(() => {
    // Reset global mock caches before each test run
    (globalThis as any).__edgeCache = new Map();
    (globalThis as any).__mockKV = new Map();
  });

  describe('Requirement 1 & 4: Universal Edge Server-Side Rendering for Dynamic Routes', () => {
    it('executes edge SSR and serves fully rendered HTML to web crawler on parameterized dynamic route /r/:id', async () => {
      const crawlerUserAgent = 'Googlebot/2.1 (+http://www.google.com/bot.html)';
      const request = new Request('https://qrcraftly.com/r/test-dynamic-id-123', {
        method: 'GET',
        headers: {
          'User-Agent': crawlerUserAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      // Simulate static asset storage returning 404 (indicating no pre-rendered static file exists)
      const context = {
        request,
        env: {},
        params: { path: ['r', 'test-dynamic-id-123'] },
        next: vi.fn().mockResolvedValue(new Response('Static Asset Not Found', { status: 404 })),
        waitUntil: vi.fn(),
      };

      const response = await catchAllHandler(context);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/html');
      expect(response.headers.get('X-EC-Cache')).toBe('MISS');

      const html = await response.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      // Verify dynamic metadata injection for crawler
      expect(html).toContain('Dynamic Redirect (test-dynamic-id-123) | QRCraftly');
      expect(html).toContain('Secure client-side decrypted redirect for dynamic link test-dynamic-id-123.');
      expect(html).toContain('https://qrcraftly.com/r/test-dynamic-id-123');
    });

    it('delivers identical pre-rendered HTML payload to human visitors and crawlers without user-agent sniffing variations', async () => {
      const crawlerReq = new Request('https://qrcraftly.com/r/shared-link-999', {
        method: 'GET',
        headers: { 'User-Agent': 'Googlebot/2.1' },
      });
      const humanReq = new Request('https://qrcraftly.com/r/shared-link-999', {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      });

      const mockNext = vi.fn().mockResolvedValue(new Response('404 Not Found', { status: 404 }));

      // Purge cache before first request
      (globalThis as any).__edgeCache.clear();

      const crawlerRes = await catchAllHandler({
        request: crawlerReq,
        env: {},
        params: { path: ['r', 'shared-link-999'] },
        next: mockNext,
        waitUntil: vi.fn(),
      });

      // Clear cache to force clean SSR execution for human visitor comparison
      (globalThis as any).__edgeCache.clear();

      const humanRes = await catchAllHandler({
        request: humanReq,
        env: {},
        params: { path: ['r', 'shared-link-999'] },
        next: mockNext,
        waitUntil: vi.fn(),
      });

      const crawlerHtml = await crawlerRes.text();
      const humanHtml = await humanRes.text();

      expect(crawlerRes.status).toBe(200);
      expect(humanRes.status).toBe(200);
      expect(humanHtml).toBe(crawlerHtml);
    });
  });

  describe('Requirement 2 & Acceptance Criteria 1 & 5: Dynamic Metadata Injection', () => {
    it('dynamically injects dynamic titles, meta tags, canonical URLs, and structured JSON-LD schema into rendered output', async () => {
      const request = new Request('https://qrcraftly.com/r/meta-check-456', {
        method: 'GET',
        headers: { 'User-Agent': 'Bingbot/2.0' },
      });

      const context = {
        request,
        env: {},
        params: { path: ['r', 'meta-check-456'] },
        next: vi.fn().mockResolvedValue(new Response('404 Not Found', { status: 404 })),
        waitUntil: vi.fn(),
      };

      const response = await catchAllHandler(context);
      const html = await response.text();

      // Title & Description
      expect(html).toContain('<title>Dynamic Redirect (meta-check-456) | QRCraftly</title>');
      expect(html).toContain('content="Secure client-side decrypted redirect for dynamic link meta-check-456."');

      // Canonical URL
      expect(html).toContain('<link rel="canonical" href="https://qrcraftly.com/r/meta-check-456"/>');

      // Open Graph Tags
      expect(html).toContain('<meta property="og:title" content="Dynamic Redirect (meta-check-456) | QRCraftly"/>');
      expect(html).toContain('<meta property="og:url" content="https://qrcraftly.com/r/meta-check-456"/>');

      // JSON-LD Structured Data Schema
      expect(html).toContain('application/ld+json');
      expect(html).toContain('"@type":"Organization"');
    });
  });

  describe('Requirement 3 & Acceptance Criteria 2: Edge Caching of Rendered Output', () => {
    it('caches server-rendered HTML at edge and serves repeat requests directly from edge cache with HIT status', async () => {
      const targetUrl = 'https://qrcraftly.com/r/cached-route-777';
      const mockNext = vi.fn().mockResolvedValue(new Response('404 Not Found', { status: 404 }));

      // First Request (Cache MISS)
      const req1 = new Request(targetUrl, { method: 'GET' });
      const res1 = await catchAllHandler({
        request: req1,
        env: {},
        next: mockNext,
        waitUntil: vi.fn(),
      });

      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-EC-Cache')).toBe('MISS');
      const html1 = await res1.text();

      // Second Request (Cache HIT)
      const req2 = new Request(targetUrl, { method: 'GET' });
      const res2 = await catchAllHandler({
        request: req2,
        env: {},
        next: mockNext,
        waitUntil: vi.fn(),
      });

      expect(res2.status).toBe(200);
      expect(res2.headers.get('X-EC-Cache')).toBe('HIT');
      const html2 = await res2.text();

      expect(html2).toBe(html1);
    });
  });

  describe('Requirement 5: Edge Cache Invalidation and Bypass Rules', () => {
    it('bypasses edge cache when cache-bypassing headers or query parameters are supplied', async () => {
      const targetUrl = 'https://qrcraftly.com/r/bypass-test-101';
      const mockNext = vi.fn().mockResolvedValue(new Response('404 Not Found', { status: 404 }));

      // Prime the cache first
      await catchAllHandler({
        request: new Request(targetUrl, { method: 'GET' }),
        env: {},
        next: mockNext,
        waitUntil: vi.fn(),
      });

      // Request with bypass-cache query param
      const bypassReq = new Request(`${targetUrl}?bypass-cache=true`, { method: 'GET' });
      const bypassRes = await catchAllHandler({
        request: bypassReq,
        env: {},
        next: mockNext,
        waitUntil: vi.fn(),
      });

      expect(bypassRes.status).toBe(200);
      expect(bypassRes.headers.get('X-EC-Cache')).toBe('MISS');

      // Request with Cache-Control: no-cache header
      const headerReq = new Request(targetUrl, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const headerRes = await catchAllHandler({
        request: headerReq,
        env: {},
        next: mockNext,
        waitUntil: vi.fn(),
      });

      expect(headerRes.status).toBe(200);
      expect(headerRes.headers.get('X-EC-Cache')).toBe('MISS');
    });

    it('purges edge cache for target route when dynamic content state is updated via API', async () => {
      // 1. Register a dynamic redirect link
      const regReq = new Request('https://qrcraftly.com/api/redirect/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirectUrl: 'https://initial-destination.com',
          turnstileToken: 'valid-turnstile-token',
        }),
      });
      const regRes = await registerRedirectHandler({ request: regReq, env: {} });
      const regData = await regRes.json() as any;
      const linkId = regData.id;
      const adminKey = regData.adminKey;

      // 2. Request /r/:id to prime the edge cache
      const routeUrl = `https://qrcraftly.com/r/${linkId}`;
      const mockNext = vi.fn().mockResolvedValue(new Response('404 Not Found', { status: 404 }));

      const initialRes = await catchAllHandler({
        request: new Request(routeUrl, { method: 'GET' }),
        env: {},
        next: mockNext,
        waitUntil: vi.fn(),
      });
      expect(initialRes.headers.get('X-EC-Cache')).toBe('MISS');

      // Verify second request hits cache
      const secondRes = await catchAllHandler({
        request: new Request(routeUrl, { method: 'GET' }),
        env: {},
        next: mockNext,
        waitUntil: vi.fn(),
      });
      expect(secondRes.headers.get('X-EC-Cache')).toBe('HIT');

      // 3. Update the dynamic redirect target via API
      const updateReq = new Request('https://qrcraftly.com/api/redirect/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: linkId,
          adminKey,
          newUrl: 'https://updated-destination.com',
        }),
      });
      const updateRes = await updateRedirectHandler({ request: updateReq, env: {} });
      expect(updateRes.status).toBe(200);

      // 4. Request /r/:id again and verify cache was purged (returns Cache MISS)
      const postUpdateRes = await catchAllHandler({
        request: new Request(routeUrl, { method: 'GET' }),
        env: {},
        next: mockNext,
        waitUntil: vi.fn(),
      });
      expect(postUpdateRes.headers.get('X-EC-Cache')).toBe('MISS');
    });
  });

  describe('Requirement 4 & Acceptance Criteria 4: Direct Static Pre-Rendered Pass-Through', () => {
    it('passes static pre-rendered routes and assets directly from static storage without executing edge SSR', async () => {
      const staticResponse = new Response('<!DOCTYPE html><html><head><title>About QRCraftly</title></head><body>Static Page</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

      const context = {
        request: new Request('https://qrcraftly.com/about', { method: 'GET' }),
        env: {},
        params: { path: ['about'] },
        next: vi.fn().mockResolvedValue(staticResponse),
        waitUntil: vi.fn(),
      };

      const response = await catchAllHandler(context);

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain('Static Page');
      // Verify SSR header is not attached for pure static pass-through
      expect(response.headers.get('X-EC-Cache')).toBeNull();
    });

    it('passes API endpoints directly through to dedicated API functions', async () => {
      const apiResponse = new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const context = {
        request: new Request('https://qrcraftly.com/api/redirect/stats', { method: 'GET' }),
        env: {},
        params: { path: ['api', 'redirect', 'stats'] },
        next: vi.fn().mockResolvedValue(apiResponse),
        waitUntil: vi.fn(),
      };

      const response = await catchAllHandler(context);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok' });
    });
  });
});
