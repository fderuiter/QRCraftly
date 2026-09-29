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

import { isEncrypted } from '../../../utils/encryption';
import { json, jsonError, readJsonBody } from './http';
import { isAllowedOrigin } from './origin';
import { applyLimit, defaultFallbackReadLimiter } from './rateLimit';
import {
  createAdminKey,
  hashAdminKey,
  incrementScans,
  insertRedirect,
  selectDestinations,
  selectForUpdate,
  selectStats,
  timingSafeEqual,
  updateDestinations,
} from './store';
import { verifyTurnstileWithSiteverify } from './turnstile';
import type { D1Like, RedirectDeps, RedirectEnv, WaitUntilContext } from './types';
import { isAdminKey, isRedirectId, readTurnstileToken, vetOptionalDestination, vetRequiredDestination } from './validation';

const RETRY_AFTER = { 'Retry-After': '60' };

/**
 * Returns the client IP Cloudflare attaches to every request.
 * @param request - Incoming request.
 * @returns The IP, or "unknown" outside Cloudflare.
 */
function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/**
 * Guards a write endpoint: allowed origin, then the write rate limiter.
 * Without a `WRITE_RATE_LIMITER` binding (or when it errors) writes fail closed
 * with a 429, never a 5xx and never unthrottled.
 * @param request - Incoming request.
 * @param env - Bindings.
 * @param route - Rate-limit key prefix.
 * @returns An error response, or null when the request may proceed.
 */
async function guardWrite(request: Request, env: RedirectEnv, route: string): Promise<Response | null> {
  if (!isAllowedOrigin(request, env.ALLOWED_ORIGINS)) {
    return jsonError(403, 'Origin not allowed');
  }
  const decision = await applyLimit(env.WRITE_RATE_LIMITER, `${route}:${clientIp(request)}`);
  if (decision === 'limited') {
    return jsonError(429, 'Too many requests, try again in a minute', RETRY_AFTER);
  }
  if (decision === 'unavailable') {
    return jsonError(429, 'Write rate limiting is unavailable, so dynamic link writes are paused', RETRY_AFTER);
  }
  return null;
}

/**
 * Guards a read endpoint with the `READ_RATE_LIMITER` binding, falling back to a
 * bounded in-isolate limiter when the binding is absent or errors.
 * @param request - Incoming request.
 * @param env - Bindings.
 * @param deps - Injected collaborators.
 * @param route - Rate-limit key prefix.
 * @returns A 429 response, or null when the request may proceed.
 */
export async function guardRead(request: Request, env: RedirectEnv, deps: RedirectDeps, route: string): Promise<Response | null> {
  const key = `${route}:${clientIp(request)}`;
  let decision = await applyLimit(env.READ_RATE_LIMITER, key);
  if (decision === 'unavailable') {
    decision = await applyLimit(deps.fallbackReadLimiter ?? defaultFallbackReadLimiter, key);
  }
  return decision === 'limited' ? jsonError(429, 'Too many requests, try again in a minute', RETRY_AFTER) : null;
}

/**
 * Returns the D1 binding or the 503 response to send when it is not bound.
 * @param env - Bindings.
 * @returns The database or an error response.
 */
function requireDb(env: RedirectEnv): D1Like | Response {
  return env.DB ?? jsonError(503, 'Dynamic redirects are not enabled on this deployment');
}

/** Vetted destinations of a register or update body. */
interface VettedDestinations {
  redirectUrl: string;
  /** `undefined`: not sent (keep), `null`: clear, string: new ciphertext. */
  iosUrl: string | null | undefined;
  androidUrl: string | null | undefined;
}

/**
 * The single destination vetting path shared by register and update, so an
 * update is held to exactly the same rules as a registration.
 * @param redirectUrl - Raw default destination.
 * @param body - Parsed body holding the optional overrides.
 * @returns The vetted destinations or a 400 response.
 */
function vetDestinations(redirectUrl: unknown, body: Record<string, unknown>): VettedDestinations | Response {
  const main = vetRequiredDestination('redirectUrl', redirectUrl);
  if (!main.ok) return jsonError(400, main.error);
  const ios = vetOptionalDestination('iosUrl', body.iosUrl);
  if (!ios.ok) return jsonError(400, ios.error);
  const android = vetOptionalDestination('androidUrl', body.androidUrl);
  if (!android.ok) return jsonError(400, android.error);
  return { redirectUrl: main.value, iosUrl: ios.value, androidUrl: android.value };
}

/**
 * `POST /api/redirect/register`: stores a new zero-knowledge redirect.
 * @param request - Incoming request.
 * @param env - Bindings.
 * @param deps - Injected collaborators.
 * @returns `201 { id, adminKey }` or an error.
 */
export async function handleRegister(request: Request, env: RedirectEnv, deps: RedirectDeps): Promise<Response> {
  const blocked = await guardWrite(request, env, 'register');
  if (blocked) return blocked;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const { body } = parsed;

  const destinations = vetDestinations(body.redirectUrl, body);
  if (destinations instanceof Response) return destinations;
  const challenge = readTurnstileToken(body);
  if (!challenge.ok) return jsonError(400, challenge.error);

  const db = requireDb(env);
  if (db instanceof Response) return db;

  // Fail closed: no secret means no registration, whatever verifier is injected.
  const secret = (env.TURNSTILE_SECRET_KEY || '').trim();
  if (!secret) return jsonError(503, 'Bot verification is not configured');
  const verify = deps.verifyTurnstile ?? ((t: string, s: string, ip: string | null) => verifyTurnstileWithSiteverify(t, s, ip));
  const ip = request.headers.get('CF-Connecting-IP');
  const verdict = await verify(challenge.value, secret, ip);
  if (!verdict.ok) return jsonError(verdict.status, verdict.error);

  const id = crypto.randomUUID();
  const adminKey = createAdminKey();
  await insertRedirect(db, {
    id,
    redirectUrl: destinations.redirectUrl,
    iosUrl: destinations.iosUrl ?? null,
    androidUrl: destinations.androidUrl ?? null,
    adminKeyHash: await hashAdminKey(adminKey),
    createdAt: new Date().toISOString(),
  });
  return json({ id, adminKey }, 201);
}

/**
 * `POST /api/redirect/update`: replaces destinations, authorized by the admin key.
 * Applies the same destination vetting as registration. `iosUrl`/`androidUrl`
 * omitted keeps the stored override; `""` or `null` clears it.
 * @param request - Incoming request.
 * @param env - Bindings.
 * @returns `200 { success: true }` or an error.
 */
export async function handleUpdate(request: Request, env: RedirectEnv): Promise<Response> {
  const blocked = await guardWrite(request, env, 'update');
  if (blocked) return blocked;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const { body } = parsed;

  if (!isRedirectId(body.id)) return jsonError(400, 'id is missing or malformed');
  if (!isAdminKey(body.adminKey)) return jsonError(400, 'adminKey is missing or malformed');
  const destinations = vetDestinations(body.redirectUrl ?? body.newUrl, body);
  if (destinations instanceof Response) return destinations;

  const db = requireDb(env);
  if (db instanceof Response) return db;

  const row = await selectForUpdate(db, body.id);
  if (!row) return jsonError(404, 'Dynamic link not found');
  const adminKeyHash = await hashAdminKey(body.adminKey);
  if (!timingSafeEqual(adminKeyHash, row.admin_key_hash)) return jsonError(403, 'Admin key does not match');

  const changed = await updateDestinations(db, body.id, adminKeyHash, {
    redirectUrl: destinations.redirectUrl,
    iosUrl: destinations.iosUrl === undefined ? row.ios_url : destinations.iosUrl,
    androidUrl: destinations.androidUrl === undefined ? row.android_url : destinations.androidUrl,
  });
  if (!changed) return jsonError(404, 'Dynamic link not found');
  return json({ success: true });
}

/**
 * `GET /api/redirect/:id`: returns the stored ciphertext for the resolver page and
 * counts the scan in the background. Never redirects and never caches, so an
 * update is visible on the very next scan.
 * @param request - Incoming request.
 * @param env - Bindings.
 * @param deps - Injected collaborators.
 * @param id - Path segment.
 * @param ctx - Execution context for background work.
 * @returns The ciphertext payload or an error.
 */
export async function handleLookup(
  request: Request,
  env: RedirectEnv,
  deps: RedirectDeps,
  id: string,
  ctx?: WaitUntilContext,
): Promise<Response> {
  const limited = await guardRead(request, env, deps, 'lookup');
  if (limited) return limited;
  if (!isRedirectId(id)) return jsonError(404, 'Dynamic link not found');

  const db = requireDb(env);
  if (db instanceof Response) return db;

  const row = await selectDestinations(db, id);
  if (!row || !isEncrypted(row.redirect_url)) return jsonError(404, 'Dynamic link not found');

  const counting = incrementScans(db, id).catch((err: unknown) => {
    console.error('[edge-redirect] scan count update failed', err);
  });
  if (ctx) ctx.waitUntil(counting);
  else await counting;

  return json({
    id: row.id,
    redirectUrl: row.redirect_url,
    ...(row.ios_url ? { iosUrl: row.ios_url } : {}),
    ...(row.android_url ? { androidUrl: row.android_url } : {}),
  });
}

/**
 * `GET /api/redirect/stats?id=`: aggregate scan count.
 * @param request - Incoming request.
 * @param env - Bindings.
 * @param deps - Injected collaborators.
 * @returns `{ id, scans, createdAt }` or an error.
 */
export async function handleStats(request: Request, env: RedirectEnv, deps: RedirectDeps): Promise<Response> {
  const limited = await guardRead(request, env, deps, 'stats');
  if (limited) return limited;
  const id = new URL(request.url).searchParams.get('id');
  if (!isRedirectId(id)) return jsonError(400, 'id is missing or malformed');

  const db = requireDb(env);
  if (db instanceof Response) return db;

  const row = await selectStats(db, id);
  if (!row) return jsonError(404, 'Dynamic link not found');
  return json({ id, scans: Number(row.scans) || 0, createdAt: row.created_at });
}
