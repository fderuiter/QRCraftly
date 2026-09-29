/*
    QRCraftly
    Copyright (C) 2025-2026 fderuiter

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

import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  handleRedirectApi,
  MAX_BODY_BYTES,
  MAX_CIPHERTEXT_LENGTH,
  MemoryRateLimiter,
  verifyTurnstileWithSiteverify,
  type RateLimitBinding,
} from '../index';
import { cipher, get, harness, post, type Harness } from './fixtures';

const call = (h: Harness, request: Request) => handleRedirectApi(request, h.env, undefined, h.deps);

async function registered(h: Harness) {
  const main = await cipher('https://example.com/');
  const res = await call(h, post('/api/redirect/register', { redirectUrl: main.value, turnstileToken: 'tok' }));
  const data = (await res.json()) as { id: string; adminKey: string };
  return { ...data, main };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Turnstile: no bypass tokens, fail closed', () => {
  it('rejects registration with 503 when TURNSTILE_SECRET_KEY is missing, without calling the verifier', async () => {
    const h = harness({ TURNSTILE_SECRET_KEY: undefined });
    const main = await cipher('https://example.com/');
    const res = await call(h, post('/api/redirect/register', { redirectUrl: main.value, turnstileToken: 'tok' }));
    expect(res.status).toBe(503);
    expect(h.verify).not.toHaveBeenCalled();
    expect(h.db.size).toBe(0);
  });

  it.each(['valid-turnstile-token', 'test-turnstile-token', 'mock-token', '1x00000000000000000000AA'])(
    'does not treat the former hard-coded token %s as valid: siteverify decides',
    async (token) => {
      const siteverify = vi.fn(async () => Response.json({ success: false, 'error-codes': ['invalid-input-response'] }));
      vi.stubGlobal('fetch', siteverify);
      const h = harness();
      const main = await cipher('https://example.com/');
      const res = await handleRedirectApi(
        post('/api/redirect/register', { redirectUrl: main.value, turnstileToken: token }),
        h.env,
        undefined,
        { fallbackReadLimiter: h.deps.fallbackReadLimiter },
      );
      expect(res.status).toBe(403);
      expect(siteverify).toHaveBeenCalledTimes(1);
      expect(h.db.size).toBe(0);
    },
  );

  it('requires a token and caps its length', async () => {
    const h = harness();
    const main = await cipher('https://example.com/');
    expect((await call(h, post('/api/redirect/register', { redirectUrl: main.value }))).status).toBe(400);
    const long = await call(h, post('/api/redirect/register', { redirectUrl: main.value, turnstileToken: 'a'.repeat(2049) }));
    expect(long.status).toBe(400);
    expect(h.verify).not.toHaveBeenCalled();
  });

  it('accepts the cf-turnstile-response field and forwards the client IP', async () => {
    const h = harness();
    const main = await cipher('https://example.com/');
    const res = await call(h, post('/api/redirect/register', { redirectUrl: main.value, 'cf-turnstile-response': 'widget-token' }));
    expect(res.status).toBe(201);
    expect(h.verify).toHaveBeenCalledWith('widget-token', 'test-secret', '203.0.113.7');
  });

  it('propagates a failed verdict without storing anything', async () => {
    const h = harness();
    h.verify.mockResolvedValueOnce({ ok: false, status: 403, error: 'Turnstile verification failed' });
    const main = await cipher('https://example.com/');
    const res = await call(h, post('/api/redirect/register', { redirectUrl: main.value, turnstileToken: 'tok' }));
    expect(res.status).toBe(403);
    expect(h.db.size).toBe(0);
  });

  describe('verifyTurnstileWithSiteverify', () => {
    it('posts secret, response and remoteip and accepts success:true', async () => {
      const fetchImpl = vi.fn(async () => Response.json({ success: true }));
      await expect(verifyTurnstileWithSiteverify('tok', 'sec', '192.0.2.1', fetchImpl)).resolves.toEqual({ ok: true });
      const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
      const form = init.body as URLSearchParams;
      expect(form.get('secret')).toBe('sec');
      expect(form.get('response')).toBe('tok');
      expect(form.get('remoteip')).toBe('192.0.2.1');
    });

    it('fails closed on a missing secret, a negative verdict, an HTTP error and a network error', async () => {
      const never = vi.fn(async () => Response.json({ success: true }));
      expect(await verifyTurnstileWithSiteverify('tok', '', null, never)).toMatchObject({ ok: false, status: 503 });
      expect(never).not.toHaveBeenCalled();
      expect(await verifyTurnstileWithSiteverify('tok', 's', null, async () => Response.json({ success: false }))).toMatchObject({ ok: false, status: 403 });
      expect(await verifyTurnstileWithSiteverify('tok', 's', null, async () => Response.json({}))).toMatchObject({ ok: false, status: 403 });
      expect(await verifyTurnstileWithSiteverify('tok', 's', null, async () => new Response('', { status: 500 }))).toMatchObject({ ok: false, status: 503 });
      expect(
        await verifyTurnstileWithSiteverify('tok', 's', null, async () => {
          throw new TypeError('network down');
        }),
      ).toMatchObject({ ok: false, status: 503 });
    });
  });
});

describe('Rate limiting on every route', () => {
  const denying: RateLimitBinding = { limit: async () => ({ success: false }) };
  const throwing: RateLimitBinding = {
    limit: async () => {
      throw new Error('binding error');
    },
  };

  it('throttles register and update with 429 + Retry-After when the write binding says no', async () => {
    const h = harness({ WRITE_RATE_LIMITER: denying });
    const main = await cipher('https://example.com/');
    const reg = await call(h, post('/api/redirect/register', { redirectUrl: main.value, turnstileToken: 'tok' }));
    expect(reg.status).toBe(429);
    expect(reg.headers.get('Retry-After')).toBe('60');
    expect(h.verify).not.toHaveBeenCalled();
    const upd = await call(h, post('/api/redirect/update', { id: crypto.randomUUID(), adminKey: 'a'.repeat(32), redirectUrl: main.value }));
    expect(upd.status).toBe(429);
    expect(h.db.size).toBe(0);
  });

  it.each([
    ['missing', undefined],
    ['erroring', throwing],
  ])('fails closed for writes with a 429 (never a 5xx) when the write binding is %s', async (_label, binding) => {
    const h = harness({ WRITE_RATE_LIMITER: binding });
    const main = await cipher('https://example.com/');
    const reg = await call(h, post('/api/redirect/register', { redirectUrl: main.value, turnstileToken: 'tok' }));
    expect(reg.status).toBe(429);
    const upd = await call(h, post('/api/redirect/update', { id: crypto.randomUUID(), adminKey: 'a'.repeat(32), redirectUrl: main.value }));
    expect(upd.status).toBe(429);
  });

  it('throttles lookups and stats through the read binding, keyed per route and client IP', async () => {
    const h = harness();
    const { id } = await registered(h);
    const limit = vi.fn(async () => ({ success: false }));
    h.env.READ_RATE_LIMITER = { limit };
    expect((await call(h, get(`/api/redirect/${id}`))).status).toBe(429);
    expect((await call(h, get(`/api/redirect/stats?id=${id}`))).status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: 'lookup:198.51.100.4' });
    expect(limit).toHaveBeenCalledWith({ key: 'stats:198.51.100.4' });
    expect(h.db.peek(id)?.scans).toBe(0);
  });

  it('falls back to the bounded in-isolate limiter for reads when the read binding is missing or errors', async () => {
    for (const binding of [undefined, throwing]) {
      const h = harness({ READ_RATE_LIMITER: binding });
      h.deps.fallbackReadLimiter = new MemoryRateLimiter(1, 60_000);
      const { id } = await registered(h);
      expect((await call(h, get(`/api/redirect/${id}`))).status).toBe(200);
      expect((await call(h, get(`/api/redirect/${id}`))).status).toBe(429);
    }
  });

  it('MemoryRateLimiter resets per window and never tracks more than maxKeys clients', async () => {
    let now = 0;
    const limiter = new MemoryRateLimiter(2, 1000, 3, () => now);
    expect((await limiter.limit({ key: 'a' })).success).toBe(true);
    expect((await limiter.limit({ key: 'a' })).success).toBe(true);
    expect((await limiter.limit({ key: 'a' })).success).toBe(false);
    now = 1000;
    expect((await limiter.limit({ key: 'a' })).success).toBe(true);
    for (let i = 0; i < 50; i += 1) await limiter.limit({ key: `ip-${i}` });
    expect(limiter.size).toBeLessThanOrEqual(3);
  });
});

describe('Origin allowlist on writes', () => {
  async function registerFrom(headers: Record<string, string>, url = '/api/redirect/register', base?: string) {
    const h = harness();
    const main = await cipher('https://example.com/');
    let request = post(url, { redirectUrl: main.value, turnstileToken: 'tok' }, headers);
    if (base) request = new Request(new URL(url, base), request);
    return call(h, request);
  }

  it.each(['https://qrcraftly.com', 'https://qrcraftly.fpderuiter.workers.dev', 'https://dev-qrcraftly.fpderuiter.workers.dev'])(
    'allows %s',
    async (origin) => {
      expect((await registerFrom({ Origin: origin })).status).toBe(201);
    },
  );

  it('allows same-origin requests (branch previews, local dev) and Referer-only requests', async () => {
    const preview = 'https://feat-x-qrcraftly.fpderuiter.workers.dev';
    expect((await registerFrom({ Origin: preview }, '/api/redirect/register', preview)).status).toBe(201);
    const h = harness();
    const main = await cipher('https://example.com/');
    const req = new Request('https://qrcraftly.com/api/redirect/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://qrcraftly.com/url-qr' },
      body: JSON.stringify({ redirectUrl: main.value, turnstileToken: 'tok' }),
    });
    expect((await call(h, req)).status).toBe(201);
  });

  it('rejects foreign origins and requests with neither Origin nor Referer', async () => {
    expect((await registerFrom({ Origin: 'https://evil.example' })).status).toBe(403);
    expect((await registerFrom({ Origin: 'https://qrcraftly.com.evil.example' })).status).toBe(403);
    expect((await registerFrom({ Origin: 'null' })).status).toBe(403);
    const h = harness();
    const bare = new Request('https://qrcraftly.com/api/redirect/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect((await call(h, bare)).status).toBe(403);
  });

  it('accepts extra origins from ALLOWED_ORIGINS', async () => {
    const h = harness({ ALLOWED_ORIGINS: 'https://a.example, https://b.example' });
    const main = await cipher('https://example.com/');
    const res = await call(h, post('/api/redirect/register', { redirectUrl: main.value, turnstileToken: 'tok' }, { Origin: 'https://b.example' }));
    expect(res.status).toBe(201);
  });
});

describe('Input validation and body cap', () => {
  it.each([
    ['plaintext https', 'https://example.com/'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['malformed ciphertext', 'enc:v1:zz:zz'],
    ['short ciphertext', `enc:v1:${'a'.repeat(24)}:abcd`],
    ['number', 42],
    ['object', { url: 'https://example.com' }],
    ['empty', ''],
  ])('rejects redirectUrl as %s with 400 on register', async (_label, redirectUrl) => {
    const h = harness();
    const res = await call(h, post('/api/redirect/register', { redirectUrl, turnstileToken: 'tok' }));
    expect(res.status).toBe(400);
    expect(h.db.size).toBe(0);
  });

  it('explains that plaintext is rejected (no open redirector)', async () => {
    const h = harness();
    const res = await call(h, post('/api/redirect/register', { redirectUrl: 'https://example.com/', turnstileToken: 'tok' }));
    expect(((await res.json()) as { error: string }).error).toContain('enc:v1:');
  });

  it('returns 400, not 500, for non-string or plaintext overrides', async () => {
    const h = harness();
    const main = await cipher('https://example.com/');
    for (const iosUrl of [123, ['x'], { a: 1 }, 'https://apps.apple.com/x']) {
      const res = await call(h, post('/api/redirect/register', { redirectUrl: main.value, iosUrl, turnstileToken: 'tok' }));
      expect(res.status).toBe(400);
    }
    const res = await call(h, post('/api/redirect/register', { redirectUrl: main.value, androidUrl: true, turnstileToken: 'tok' }));
    expect(res.status).toBe(400);
  });

  it('applies the same destination vetting on update as on register', async () => {
    const h = harness();
    const { id, adminKey, main } = await registered(h);
    const bad = [
      { redirectUrl: 'https://plain.example/' },
      { redirectUrl: main.value, iosUrl: 'https://plain.example/' },
      { redirectUrl: main.value, androidUrl: 7 },
      { redirectUrl: 'x'.repeat(MAX_CIPHERTEXT_LENGTH + 1) },
    ];
    for (const body of bad) {
      const res = await call(h, post('/api/redirect/update', { id, adminKey, ...body }));
      expect(res.status).toBe(400);
    }
    expect(h.db.peek(id)?.redirect_url).toBe(main.value);
  });

  it('rejects malformed ids and admin keys on update', async () => {
    const h = harness();
    const { id, adminKey, main } = await registered(h);
    expect((await call(h, post('/api/redirect/update', { id: 'x', adminKey, redirectUrl: main.value }))).status).toBe(400);
    expect((await call(h, post('/api/redirect/update', { id, adminKey: 12, redirectUrl: main.value }))).status).toBe(400);
    expect((await call(h, post('/api/redirect/update', { id, redirectUrl: main.value }))).status).toBe(400);
  });

  it('rejects ciphertext longer than MAX_CIPHERTEXT_LENGTH', async () => {
    const h = harness();
    const huge = `enc:v1:${'a'.repeat(24)}:${'ab'.repeat(MAX_CIPHERTEXT_LENGTH)}`;
    const res = await call(h, post('/api/redirect/register', { redirectUrl: huge.slice(0, MAX_BODY_BYTES - 200), turnstileToken: 'tok' }));
    expect(res.status).toBe(400);
  });

  it('caps the body size (413) by declared length and by actual length', async () => {
    const h = harness();
    const big = JSON.stringify({ redirectUrl: 'a'.repeat(MAX_BODY_BYTES + 10) });
    expect((await call(h, post('/api/redirect/register', big))).status).toBe(413);
    const declared = post('/api/redirect/register', '{}', { 'Content-Length': String(MAX_BODY_BYTES + 1) });
    expect((await call(h, declared)).status).toBe(413);
  });

  it('rejects non-JSON content types (415), malformed JSON and non-object bodies (400)', async () => {
    const h = harness();
    expect((await call(h, post('/api/redirect/register', '{}', { 'Content-Type': 'text/plain' }))).status).toBe(415);
    expect((await call(h, post('/api/redirect/register', '{not json'))).status).toBe(400);
    expect((await call(h, post('/api/redirect/register', '[1,2]'))).status).toBe(400);
    expect((await call(h, post('/api/redirect/register', 'null'))).status).toBe(400);
  });
});
