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

import { handleLookup, handleRegister, handleStats, handleUpdate, guardRead } from './handlers';
import { jsonError } from './http';
import { redirectExists } from './store';
import type { RedirectDeps, RedirectEnv, WaitUntilContext, WorkerEnv } from './types';
import { isRedirectId } from './validation';

/** Path prefix of the dynamic redirect API. */
export const API_PREFIX = '/api/redirect';

/** Path prefix of scanned dynamic links (`/r/<id>#key=...`). */
const RESOLVER_PREFIX = '/r/';

/**
 * Pre-rendered static shell of the resolver page (`src/pages/r/@id`). The Worker
 * serves it for every existing `/r/<id>`; the page reads the id from the URL.
 */
export const RESOLVER_SHELL_PATH = '/r/shell/';

/**
 * Routes a request under `/api/redirect`. Unknown sub-paths get a JSON 404,
 * wrong methods a 405, and unexpected failures a generic 500 that never
 * echoes internal error text.
 * @param request - Incoming request.
 * @param env - Bindings.
 * @param ctx - Execution context for background work.
 * @param deps - Injected collaborators (tests and local dev only).
 * @returns The API response.
 */
export async function handleRedirectApi(
  request: Request,
  env: RedirectEnv,
  ctx?: WaitUntilContext,
  deps: RedirectDeps = {},
): Promise<Response> {
  const { pathname } = new URL(request.url);
  const sub = pathname.slice(API_PREFIX.length).replace(/^\/+/, '');
  const method = request.method.toUpperCase();

  const expect = (allowed: 'GET' | 'POST'): Response | null =>
    method === allowed ? null : jsonError(405, 'Method not allowed', { Allow: allowed });

  try {
    if (sub === 'register') return expect('POST') ?? (await handleRegister(request, env, deps));
    if (sub === 'update') return expect('POST') ?? (await handleUpdate(request, env));
    if (sub === 'stats') return expect('GET') ?? (await handleStats(request, env, deps));
    if (sub !== '' && !sub.includes('/')) return expect('GET') ?? (await handleLookup(request, env, deps, sub, ctx));
    return jsonError(404, 'Not found');
  } catch (err) {
    console.error('[edge-redirect] unhandled error', err);
    return jsonError(500, 'Internal error');
  }
}

/**
 * Returns a real 404 for a path the Worker does not serve, reusing the static
 * 404 page body when the assets binding has one. Never cached.
 * @param request - Incoming request.
 * @param env - Worker bindings.
 * @returns A 404 response.
 */
async function notFound(request: Request, env: WorkerEnv): Promise<Response> {
  let body: BodyInit | null = 'Not found';
  let contentType = 'text/plain; charset=utf-8';
  try {
    const page = await env.ASSETS.fetch(new Request(new URL('/404', request.url)));
    if (page.headers.get('Content-Type')?.includes('text/html')) {
      body = page.body;
      contentType = 'text/html; charset=utf-8';
    }
  } catch {
    // Fall back to the plain-text body.
  }
  return new Response(body, {
    status: 404,
    headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

/**
 * Serves `/r/<id>`: the static resolver shell for an existing redirect, a real 404
 * otherwise. The shell decrypts the destination in the browser with the `#key=`
 * fragment, which never reaches the edge.
 * @param request - Incoming request.
 * @param env - Worker bindings.
 * @param deps - Injected collaborators.
 * @returns The shell page or a 404.
 */
export async function serveResolverPage(request: Request, env: WorkerEnv, deps: RedirectDeps = {}): Promise<Response> {
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const id = new URL(request.url).pathname.slice(RESOLVER_PREFIX.length).replace(/\/$/, '');
  if (!isRedirectId(id) || !env.DB) return notFound(request, env);

  const limited = await guardRead(request, env, deps, 'resolve');
  if (limited) return limited;

  try {
    if (!(await redirectExists(env.DB, id))) return notFound(request, env);
  } catch (err) {
    console.error('[edge-redirect] resolver lookup failed', err);
    return new Response('Temporarily unavailable', { status: 503, headers: { 'Retry-After': '30', 'Cache-Control': 'no-store' } });
  }

  const shell = await env.ASSETS.fetch(new Request(new URL(RESOLVER_SHELL_PATH, request.url)));
  if (!shell.ok) return notFound(request, env);

  const headers = new Headers(shell.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(method === 'HEAD' ? null : shell.body, { status: 200, headers });
}

/**
 * The Worker's routing: `/api/redirect/*` to the API, `/r/*` to the resolver
 * shell, everything else to static assets (whose own 404 stays a 404).
 * @param request - Incoming request.
 * @param env - Worker bindings.
 * @param ctx - Execution context.
 * @param deps - Injected collaborators.
 * @returns The response.
 */
export function routeEdgeRequest(request: Request, env: WorkerEnv, ctx?: WaitUntilContext, deps: RedirectDeps = {}): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`)) {
    return handleRedirectApi(request, env, ctx, deps);
  }
  if (pathname.startsWith(RESOLVER_PREFIX)) {
    return serveResolverPage(request, env, deps);
  }
  return env.ASSETS.fetch(request);
}
