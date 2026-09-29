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

import { describe, it, expect, vi } from 'vitest';
import { decryptUrl } from '@/utils/encryption';
import { handleRedirectApi, type D1Statement } from '../index';
import { cipher, get, harness, post, type Harness } from './fixtures';

function failingStatement(): D1Statement {
  const statement: D1Statement = {
    bind: () => statement,
    first: async () => null,
    run: async () => {
      throw new Error('write quota exceeded');
    },
  };
  return statement;
}

async function register(h: Harness, body: Record<string, unknown>) {
  const res = await handleRedirectApi(post('/api/redirect/register', { turnstileToken: 'tok', ...body }), h.env, undefined, h.deps);
  return { res, data: (await res.json()) as { id: string; adminKey: string; error?: string } };
}

describe('edge-redirect API: zero-knowledge register, lookup, update, stats', () => {
  it('registers encrypted destinations (201) and stores only ciphertext and a hashed admin key', async () => {
    const h = harness();
    const main = await cipher('https://example.com/private');
    const ios = await cipher('https://apps.apple.com/app/id1', main.key);
    const android = await cipher('https://play.google.com/store/apps/details?id=x', main.key);

    const { res, data } = await register(h, { redirectUrl: main.value, iosUrl: ios.value, androidUrl: android.value });

    expect(res.status).toBe(201);
    expect(data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(data.adminKey).toMatch(/^[0-9a-f]{32}$/);
    const row = h.db.peek(data.id);
    expect(row?.redirect_url).toBe(main.value);
    expect(row?.ios_url).toBe(ios.value);
    expect(row?.android_url).toBe(android.value);
    expect(row?.admin_key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row?.admin_key_hash).not.toBe(data.adminKey);
    expect(JSON.stringify(row)).not.toContain('example.com');
  });

  it('skips reputation checks for encrypted payloads (no reputation error for ciphertext of any URL)', async () => {
    const h = harness();
    // The server cannot read ciphertext, so even a scary-looking destination registers.
    const main = await cipher('https://phishing-looking-name.example/');
    const { res } = await register(h, { redirectUrl: main.value });
    expect(res.status).toBe(201);
  });

  it('returns ciphertext JSON on lookup (never a 307), uncached, and counts the scan', async () => {
    const h = harness();
    const main = await cipher('https://example.com/a');
    const { data } = await register(h, { redirectUrl: main.value });

    const waitUntil = vi.fn();
    const res = await handleRedirectApi(get(`/api/redirect/${data.id}`), h.env, { waitUntil }, h.deps);
    expect(res.status).toBe(200);
    expect(res.headers.get('Location')).toBeNull();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Robots-Tag')).toContain('noindex');
    const payload = (await res.json()) as { redirectUrl: string; iosUrl?: string };
    expect(payload.redirectUrl).toBe(main.value);
    expect(payload.iosUrl).toBeUndefined();
    expect(await decryptUrl(payload.redirectUrl, main.key)).toBe('https://example.com/a');

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    expect(h.db.peek(data.id)?.scans).toBe(1);
  });

  it('serves the new destination on the very next lookup after an update (no stale cache)', async () => {
    const h = harness();
    const first = await cipher('https://old.example/');
    const { data } = await register(h, { redirectUrl: first.value });
    await handleRedirectApi(get(`/api/redirect/${data.id}`), h.env, undefined, h.deps);

    const second = await cipher('https://new.example/', first.key);
    const upd = await handleRedirectApi(
      post('/api/redirect/update', { id: data.id, adminKey: data.adminKey, newUrl: second.value }),
      h.env,
      undefined,
      h.deps,
    );
    expect(upd.status).toBe(200);

    const res = await handleRedirectApi(get(`/api/redirect/${data.id}`), h.env, undefined, h.deps);
    expect(((await res.json()) as { redirectUrl: string }).redirectUrl).toBe(second.value);
  });

  it('keeps an omitted override, and clears it when sent as "" or null', async () => {
    const h = harness();
    const main = await cipher('https://example.com/');
    const ios = await cipher('https://apps.apple.com/x', main.key);
    const android = await cipher('https://play.google.com/x', main.key);
    const { data } = await register(h, { redirectUrl: main.value, iosUrl: ios.value, androidUrl: android.value });
    const update = (extra: Record<string, unknown>) =>
      handleRedirectApi(
        post('/api/redirect/update', { id: data.id, adminKey: data.adminKey, redirectUrl: main.value, ...extra }),
        h.env,
        undefined,
        h.deps,
      );

    expect((await update({})).status).toBe(200);
    expect(h.db.peek(data.id)?.ios_url).toBe(ios.value);
    expect(h.db.peek(data.id)?.android_url).toBe(android.value);

    expect((await update({ iosUrl: '' })).status).toBe(200);
    expect(h.db.peek(data.id)?.ios_url).toBeNull();
    expect(h.db.peek(data.id)?.android_url).toBe(android.value);

    expect((await update({ androidUrl: null })).status).toBe(200);
    expect(h.db.peek(data.id)?.android_url).toBeNull();

    const res = await handleRedirectApi(get(`/api/redirect/${data.id}`), h.env, undefined, h.deps);
    const payload = (await res.json()) as Record<string, unknown>;
    expect(payload).not.toHaveProperty('iosUrl');
    expect(payload).not.toHaveProperty('androidUrl');
  });

  it('rejects a wrong admin key (403) and an unknown id (404) on update', async () => {
    const h = harness();
    const main = await cipher('https://example.com/');
    const { data } = await register(h, { redirectUrl: main.value });

    const wrong = await handleRedirectApi(
      post('/api/redirect/update', { id: data.id, adminKey: 'f'.repeat(32), redirectUrl: main.value }),
      h.env,
      undefined,
      h.deps,
    );
    expect(wrong.status).toBe(403);

    const unknown = await handleRedirectApi(
      post('/api/redirect/update', { id: crypto.randomUUID(), adminKey: data.adminKey, redirectUrl: main.value }),
      h.env,
      undefined,
      h.deps,
    );
    expect(unknown.status).toBe(404);
  });

  it('reports aggregate stats and validates the id', async () => {
    const h = harness();
    const main = await cipher('https://example.com/');
    const { data } = await register(h, { redirectUrl: main.value });
    await handleRedirectApi(get(`/api/redirect/${data.id}`), h.env, undefined, h.deps);
    await handleRedirectApi(get(`/api/redirect/${data.id}`), h.env, undefined, h.deps);

    const ok = await handleRedirectApi(get(`/api/redirect/stats?id=${data.id}`), h.env, undefined, h.deps);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ id: data.id, scans: 2 });

    expect((await handleRedirectApi(get('/api/redirect/stats?id=nope'), h.env, undefined, h.deps)).status).toBe(400);
    expect((await handleRedirectApi(get(`/api/redirect/stats?id=${crypto.randomUUID()}`), h.env, undefined, h.deps)).status).toBe(404);
  });

  it('returns 404 for unknown and malformed ids and for unknown API paths', async () => {
    const h = harness();
    expect((await handleRedirectApi(get(`/api/redirect/${crypto.randomUUID()}`), h.env, undefined, h.deps)).status).toBe(404);
    expect((await handleRedirectApi(get('/api/redirect/not-an-id'), h.env, undefined, h.deps)).status).toBe(404);
    expect((await handleRedirectApi(get('/api/redirect/a/b'), h.env, undefined, h.deps)).status).toBe(404);
    expect((await handleRedirectApi(get('/api/redirect'), h.env, undefined, h.deps)).status).toBe(404);
  });

  it('never serves a stored plaintext destination (defence in depth against legacy rows)', async () => {
    const h = harness();
    const id = crypto.randomUUID();
    await h.db
      .prepare('INSERT INTO redirects (id, redirect_url, ios_url, android_url, admin_key_hash, scans, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
      .bind(id, 'https://evil.example/', null, null, 'x'.repeat(64), new Date().toISOString())
      .run();
    const res = await handleRedirectApi(get(`/api/redirect/${id}`), h.env, undefined, h.deps);
    expect(res.status).toBe(404);
  });

  it('answers 405 with Allow for wrong methods', async () => {
    const h = harness();
    const res = await handleRedirectApi(get('/api/redirect/register'), h.env, undefined, h.deps);
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
    const res2 = await handleRedirectApi(post('/api/redirect/stats', {}), h.env, undefined, h.deps);
    expect(res2.status).toBe(405);
    expect(res2.headers.get('Allow')).toBe('GET');
  });

  it('answers 503 (not a crash) when D1 is not bound', async () => {
    const h = harness({ DB: undefined });
    const main = await cipher('https://example.com/');
    expect((await register(h, { redirectUrl: main.value })).res.status).toBe(503);
    expect((await handleRedirectApi(get(`/api/redirect/${crypto.randomUUID()}`), h.env, undefined, h.deps)).status).toBe(503);
  });

  it('hides internal error text behind a generic 500', async () => {
    const h = harness();
    h.env.DB = {
      prepare: () => {
        throw new Error('D1_ERROR: secret internal detail');
      },
    };
    const res = await handleRedirectApi(get(`/api/redirect/${crypto.randomUUID()}`), h.env, undefined, h.deps);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain('secret internal detail');
  });

  it('logs but does not fail a lookup when the scan counter update fails', async () => {
    const h = harness();
    const main = await cipher('https://example.com/');
    const { data } = await register(h, { redirectUrl: main.value });
    const realPrepare = h.db.prepare.bind(h.db);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.env.DB = {
      prepare: (q: string) => {
        if (q.startsWith('UPDATE redirects SET scans')) {
          return failingStatement();
        }
        return realPrepare(q);
      },
    };
    const res = await handleRedirectApi(get(`/api/redirect/${data.id}`), h.env, undefined, h.deps);
    expect(res.status).toBe(200);
    expect(errSpy).toHaveBeenCalled();
  });
});
