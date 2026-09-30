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

import type { Connect } from 'vite';
import { MAX_BODY_BYTES } from './lib/http';
import { MockD1Database } from './lib/mockD1';
import { MemoryRateLimiter } from './lib/rateLimit';
import { API_PREFIX, handleRedirectApi } from './lib/router';
import type { RedirectDeps, RedirectEnv } from './lib/types';

export { MockD1Database } from './lib/mockD1';

/** Local-only bindings: in-memory D1, in-memory limiters and a placeholder secret. */
export interface DevRedirectBackend {
  env: RedirectEnv;
  deps: RedirectDeps;
  db: MockD1Database;
}

/**
 * Builds the in-memory backend used by `pnpm dev`. The Turnstile verifier accepts
 * any non-empty token because the dev page has no real widget; it lives only in
 * this dev entry point and is never part of the Worker bundle.
 * @returns The dev backend.
 */
export function createDevRedirectBackend(): DevRedirectBackend {
  const db = new MockD1Database();
  return {
    db,
    env: {
      DB: db,
      TURNSTILE_SECRET_KEY: 'local-dev-placeholder',
      WRITE_RATE_LIMITER: new MemoryRateLimiter(30, 60_000),
      READ_RATE_LIMITER: new MemoryRateLimiter(600, 60_000),
    },
    deps: {
      verifyTurnstile: async (token) => (token ? { ok: true } : { ok: false, status: 403, error: 'Turnstile verification failed' }),
    },
  };
}

/**
 * Vite (Connect) middleware serving `/api/redirect/*` from an in-memory mock D1 so
 * dynamic links can be created and resolved locally with no Cloudflare credentials.
 * `/r/<id>` needs no middleware in dev: Vike renders the resolver page directly.
 * @param backend - Backend to serve (a fresh in-memory one by default).
 * @returns The middleware.
 */
export function createDevRedirectMiddleware(backend: DevRedirectBackend = createDevRedirectBackend()): Connect.NextHandleFunction {
  return (req, res, next) => {
    const path = (req.url || '').split('?')[0];
    if (path !== API_PREFIX && !path.startsWith(`${API_PREFIX}/`)) {
      next();
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      // Keep one byte past the cap so the handler still answers 413.
      if (size <= MAX_BODY_BYTES + 1) chunks.push(chunk);
    });
    req.on('error', next);
    req.on('end', () => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(name, value);
        else if (Array.isArray(value)) headers.set(name, value.join(', '));
      }
      headers.set('CF-Connecting-IP', req.socket.remoteAddress || '127.0.0.1');
      const method = (req.method || 'GET').toUpperCase();
      const request = new Request(`http://${req.headers.host || 'localhost'}${req.url || '/'}`, {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
      });
      handleRedirectApi(request, backend.env, undefined, backend.deps)
        .then(async (response) => {
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        })
        .catch(next);
    });
  };
}
