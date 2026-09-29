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

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, it, expect, vi } from 'vitest';
import worker from '../worker';
import { RESOLVER_SHELL_PATH, routeEdgeRequest, type AssetsBinding, type WorkerEnv } from '../index';
import { createDevRedirectBackend, createDevRedirectMiddleware } from '../dev';
import { cipher, get, harness, post } from './fixtures';

const SHELL_HTML = '<!doctype html><html><body>resolver shell</body></html>';
const NOT_FOUND_HTML = '<!doctype html><html><body>404 page</body></html>';

/** Minimal stand-in for the Workers Static Assets binding. */
function fakeAssets() {
  return {
    fetch: vi.fn<AssetsBinding['fetch']>(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === RESOLVER_SHELL_PATH) return new Response(SHELL_HTML, { headers: { 'Content-Type': 'text/html' } });
      if (pathname === '/404') return new Response(NOT_FOUND_HTML, { headers: { 'Content-Type': 'text/html' } });
      if (pathname === '/about') return new Response('<p>about</p>', { headers: { 'Content-Type': 'text/html' } });
      return new Response(null, { status: 404 });
    }),
  };
}

async function workerHarness() {
  const h = harness();
  const assets = fakeAssets();
  const env: WorkerEnv = { ...h.env, ASSETS: assets };
  const main = await cipher('https://example.com/');
  const res = await routeEdgeRequest(post('/api/redirect/register', { redirectUrl: main.value, turnstileToken: 'tok' }), env, undefined, h.deps);
  const { id } = (await res.json()) as { id: string };
  return { h, env, assets, id };
}

describe('Worker entry routing', () => {
  it('routes /api/redirect/* to the API and everything else to static assets', async () => {
    const { h, env, assets, id } = await workerHarness();
    const api = await routeEdgeRequest(get(`/api/redirect/${id}`), env, undefined, h.deps);
    expect(api.status).toBe(200);
    expect(api.headers.get('Content-Type')).toContain('application/json');

    const about = await routeEdgeRequest(get('/about'), env, undefined, h.deps);
    expect(await about.text()).toBe('<p>about</p>');
    expect(assets.fetch).toHaveBeenCalled();
  });

  it('returns a real, uncached 404 for unknown paths instead of a soft 200', async () => {
    const { h, env } = await workerHarness();
    const res = await routeEdgeRequest(get('/some/random/path-123'), env, undefined, h.deps);
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control') ?? '').not.toContain('s-maxage');
  });

  it('serves the resolver shell for an existing /r/<id>, uncached and noindex', async () => {
    const { h, env, id } = await workerHarness();
    for (const path of [`/r/${id}`, `/r/${id}/`]) {
      const res = await routeEdgeRequest(get(path), env, undefined, h.deps);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(SHELL_HTML);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      expect(res.headers.get('X-Robots-Tag')).toContain('noindex');
      expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    }
    const head = await routeEdgeRequest(new Request(`https://qrcraftly.com/r/${id}`, { method: 'HEAD' }), env, undefined, h.deps);
    expect(head.status).toBe(200);
  });

  it('answers a real 404 (with the static 404 page) for unknown or malformed /r/ ids', async () => {
    const { h, env } = await workerHarness();
    for (const path of [`/r/${crypto.randomUUID()}`, '/r/not-an-id', '/r/', '/r/shell/']) {
      const res = await routeEdgeRequest(get(path), env, undefined, h.deps);
      expect(res.status).toBe(404);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    }
    const res = await routeEdgeRequest(get('/r/not-an-id'), env, undefined, h.deps);
    expect(await res.text()).toBe(NOT_FOUND_HTML);
  });

  it('returns 404 for /r/ when D1 is not bound, and rate limits /r/ lookups', async () => {
    const { h, env, id } = await workerHarness();
    expect((await routeEdgeRequest(get(`/r/${id}`), { ...env, DB: undefined }, undefined, h.deps)).status).toBe(404);
    const limited = { ...env, READ_RATE_LIMITER: { limit: async () => ({ success: false }) } };
    expect((await routeEdgeRequest(get(`/r/${id}`), limited, undefined, h.deps)).status).toBe(429);
    expect((await routeEdgeRequest(post(`/r/${id}`, {}), env, undefined, h.deps)).status).toBe(405);
  });

  it('exposes a default export whose fetch delegates to the router', async () => {
    const { env } = await workerHarness();
    const res = await worker.fetch(get('/about'), env, { waitUntil: () => {} });
    expect(res.status).toBe(200);
  });
});

describe('Vite dev middleware (pnpm dev without Cloudflare credentials)', () => {
  let server: Server | undefined;
  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
  });

  async function start() {
    const backend = createDevRedirectBackend();
    const middleware = createDevRedirectMiddleware(backend);
    server = createServer((req, res) =>
      middleware(req, res, () => {
        res.statusCode = 418;
        res.end('next');
      }),
    );
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    return { base: `http://127.0.0.1:${port}`, backend };
  }

  it('creates, resolves and updates a dynamic link against the in-memory D1', async () => {
    const { base, backend } = await start();
    const main = await cipher('https://example.com/dev');
    const headers = { 'Content-Type': 'application/json', Origin: base };

    const reg = await fetch(`${base}/api/redirect/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ redirectUrl: main.value, turnstileToken: 'dev-token' }),
    });
    expect(reg.status).toBe(201);
    const { id, adminKey } = (await reg.json()) as { id: string; adminKey: string };
    expect(backend.db.size).toBe(1);

    const look = await fetch(`${base}/api/redirect/${id}`);
    expect(((await look.json()) as { redirectUrl: string }).redirectUrl).toBe(main.value);

    const next = await cipher('https://example.com/dev2', main.key);
    const upd = await fetch(`${base}/api/redirect/update`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id, adminKey, redirectUrl: next.value }),
    });
    expect(upd.status).toBe(200);
    const stats = await fetch(`${base}/api/redirect/stats?id=${id}`);
    expect(await stats.json()).toMatchObject({ scans: 1 });
  });

  it('still enforces encryption, origin and body-size rules locally', async () => {
    const { base } = await start();
    const plain = await fetch(`${base}/api/redirect/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ redirectUrl: 'https://example.com/', turnstileToken: 'dev-token' }),
    });
    expect(plain.status).toBe(400);
    const foreign = await fetch(`${base}/api/redirect/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      body: '{}',
    });
    expect(foreign.status).toBe(403);
    const huge = await fetch(`${base}/api/redirect/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ redirectUrl: 'a'.repeat(40_000) }),
    });
    expect(huge.status).toBe(413);
  });

  it('passes non-API requests (including /r/<id>, rendered by Vike in dev) to the next middleware', async () => {
    const { base } = await start();
    expect((await fetch(`${base}/r/${crypto.randomUUID()}`)).status).toBe(418);
    expect((await fetch(`${base}/about`)).status).toBe(418);
  });
});
