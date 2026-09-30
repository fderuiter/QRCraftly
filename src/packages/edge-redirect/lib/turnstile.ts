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

import type { TurnstileOutcome } from './types';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 3000;

/**
 * Verifies a Turnstile token with Cloudflare siteverify. Production code contains
 * no bypass tokens and no fallback secret: tests and the local dev server inject
 * their own verifier instead.
 *
 * Fails closed in every error path: a missing secret, an unreachable or erroring
 * siteverify service, and an unsuccessful verdict all reject the request.
 * @param token - Token produced by the client-side widget.
 * @param secret - `TURNSTILE_SECRET_KEY` binding value.
 * @param remoteIp - Client IP (`CF-Connecting-IP`), forwarded to siteverify when present.
 * @param fetchImpl - Network implementation (injectable for tests).
 * @returns The verification outcome.
 */
export async function verifyTurnstileWithSiteverify(
  token: string,
  secret: string,
  remoteIp: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileOutcome> {
  if (!secret) {
    return { ok: false, status: 503, error: 'Bot verification is not configured' };
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (remoteIp) form.set('remoteip', remoteIp);

  let verdict: unknown;
  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, status: 503, error: 'Bot verification service unavailable' };
    }
    verdict = await res.json();
  } catch {
    return { ok: false, status: 503, error: 'Bot verification service unavailable' };
  }

  if (verdict && typeof verdict === 'object' && 'success' in verdict && verdict.success === true) {
    return { ok: true };
  }
  return { ok: false, status: 403, error: 'Turnstile verification failed' };
}
