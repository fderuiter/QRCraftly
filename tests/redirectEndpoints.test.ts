import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestPost as registerHandler } from '../functions/api/redirect/register';
import { onRequestPost as updateHandler } from '../functions/api/redirect/update';
import { onRequestGet as getHandler } from '../functions/api/redirect/[id]';

describe('Double-Ended Redirect Security Endpoints', () => {
  beforeEach(() => {
    // Clear the local mock KV before each test
    (globalThis as any).__mockKV = new Map<string, string>();
  });

  describe('POST /api/redirect/register', () => {
    it('should successfully register a standard http/https URL', async () => {
      const payload = { redirectUrl: 'https://standard-safe-url.com/path?foo=bar', turnstileToken: 'valid-turnstile-token' };
      const request = new Request('https://domain.com/api/redirect/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const response = await registerHandler({ request, env: {} });
      expect(response.status).toBe(200);

      const body = await response.json() as any;
      expect(body.id).toBeDefined();
      expect(body.adminKey).toBeDefined();
      expect(body.redirectUrl).toBe(payload.redirectUrl);

      // Verify it was stored in our mock KV
      const stored = (globalThis as any).__mockKV.get(`redirect:${body.id}`);
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored);
      expect(parsed.redirectUrl).toBe(payload.redirectUrl);
    });

    it('should reject a request with missing redirectUrl', async () => {
      const request = new Request('https://domain.com/api/redirect/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnstileToken: 'valid-turnstile-token' }),
      });

      const response = await registerHandler({ request, env: {} });
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error).toBe('Missing redirectUrl');
    });

    it('should reject URLs containing javascript: schemes', async () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(2)',
        'java\nscript:alert(3)',
        '&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(4)', // obfuscated javascript:
      ];

      for (const url of dangerousUrls) {
        const request = new Request('https://domain.com/api/redirect/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirectUrl: url, turnstileToken: 'valid-turnstile-token' }),
        });

        const response = await registerHandler({ request, env: {} });
        expect(response.status).toBe(400);
        const body = await response.json() as any;
        expect(body.error).toContain('Unsafe or dangerous redirect URL scheme detected');
      }
    });

    it('should reject URLs containing data: schemes', async () => {
      const dangerousUrls = [
        'data:text/html,<script>alert(1)</script>',
        'DATA:image/svg+xml;base64,PHN2Zz4=',
      ];

      for (const url of dangerousUrls) {
        const request = new Request('https://domain.com/api/redirect/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirectUrl: url, turnstileToken: 'valid-turnstile-token' }),
        });

        const response = await registerHandler({ request, env: {} });
        expect(response.status).toBe(400);
        const body = await response.json() as any;
        expect(body.error).toContain('Unsafe or dangerous redirect URL scheme detected');
      }
    });

    it('should reject URLs containing vbscript: schemes', async () => {
      const url = 'vbscript:msgbox("Hello")';
      const request = new Request('https://domain.com/api/redirect/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl: url, turnstileToken: 'valid-turnstile-token' }),
      });

      const response = await registerHandler({ request, env: {} });
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error).toContain('Unsafe or dangerous redirect URL scheme detected');
    });
  });

  describe('POST /api/redirect/update', () => {
    let testId: string;
    let testAdminKey: string;

    beforeEach(async () => {
      // Register a safe link first
      const payload = { redirectUrl: 'https://initial-safe-url.com', turnstileToken: 'valid-turnstile-token' };
      const request = new Request('https://domain.com/api/redirect/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const response = await registerHandler({ request, env: {} });
      const body = await response.json() as any;
      testId = body.id;
      testAdminKey = body.adminKey;
    });

    it('should successfully update a redirect with standard safe URL', async () => {
      const updatePayload = {
        id: testId,
        adminKey: testAdminKey,
        newUrl: 'https://updated-safe-url.com',
      };
      const request = new Request('https://domain.com/api/redirect/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const response = await updateHandler({ request, env: {} });
      expect(response.status).toBe(200);
      const body = await response.json() as any;
      expect(body.success).toBe(true);
      expect(body.redirectUrl).toBe('https://updated-safe-url.com');

      // Verify KV was updated
      const stored = (globalThis as any).__mockKV.get(`redirect:${testId}`);
      const parsed = JSON.parse(stored);
      expect(parsed.redirectUrl).toBe('https://updated-safe-url.com');
    });

    it('should reject update if unauthorized', async () => {
      const updatePayload = {
        id: testId,
        adminKey: 'wrong-admin-key',
        newUrl: 'https://updated-safe-url.com',
      };
      const request = new Request('https://domain.com/api/redirect/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const response = await updateHandler({ request, env: {} });
      expect(response.status).toBe(401);
      const body = await response.json() as any;
      expect(body.error).toBe('Unauthorized');
    });

    it('should reject update if target is javascript: scheme', async () => {
      const updatePayload = {
        id: testId,
        adminKey: testAdminKey,
        newUrl: 'javascript:alert(1)',
      };
      const request = new Request('https://domain.com/api/redirect/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const response = await updateHandler({ request, env: {} });
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error).toContain('Unsafe or dangerous redirect URL scheme detected');
    });
  });

  describe('GET /api/redirect/[id]', () => {
    it('should successfully execute standard safe redirect and increment scan count', async () => {
      // 1. Register
      const registerRequest = new Request('https://domain.com/api/redirect/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl: 'https://my-good-site.com', turnstileToken: 'valid-turnstile-token' }),
      });
      const regResponse = await registerHandler({ request: registerRequest, env: {} });
      const regBody = await regResponse.json() as any;

      // 2. Fetch redirect
      const redirectRequest = new Request(`https://domain.com/api/redirect/${regBody.id}`, {
        method: 'GET',
      });
      const response = await getHandler({
        request: redirectRequest,
        env: {},
        params: { id: regBody.id },
      });

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('https://my-good-site.com');

      // Verify scans incremented
      const stored = (globalThis as any).__mockKV.get(`redirect:${regBody.id}`);
      const parsed = JSON.parse(stored);
      expect(parsed.scans).toBe(1);
    });

    it('should block execution and return a secure HTML warning page if stored URL is unsafe', async () => {
      // Direct insertion of a malicious URL into KV to simulate bypass / pre-existing unsafe record
      const maliciousData = {
        id: 'malicious-id-123',
        redirectUrl: 'javascript:alert("stored XSS")',
        adminKey: 'key',
        scans: 0,
        createdAt: new Date().toISOString(),
      };
      (globalThis as any).__mockKV.set('redirect:malicious-id-123', JSON.stringify(maliciousData));

      const redirectRequest = new Request('https://domain.com/api/redirect/malicious-id-123', {
        method: 'GET',
      });
      const response = await getHandler({
        request: redirectRequest,
        env: {},
        params: { id: 'malicious-id-123' },
      });

      expect(response.status).toBe(403);
      expect(response.headers.get('Content-Type')).toContain('text/html');
      
      const html = await response.text();
      expect(html).toContain('Security Warning');
      expect(html).toContain('unsafe or dangerous protocol scheme');
    });
  });
});
