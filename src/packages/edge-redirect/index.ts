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

/**
 * Zero-knowledge dynamic redirect engine for the Cloudflare Worker entry
 * (`worker.ts`) and the Vite dev server (`dev.ts`).
 *
 * The API stores only client-side `enc:v1:` ciphertext in D1, rate limits every
 * route through Cloudflare Rate Limiting bindings, verifies Turnstile on
 * registration (failing closed), and never caches destinations.
 */
export { handleRedirectApi, routeEdgeRequest, RESOLVER_SHELL_PATH } from './lib/router';
export { MemoryRateLimiter } from './lib/rateLimit';
export { verifyTurnstileWithSiteverify } from './lib/turnstile';
export { MAX_BODY_BYTES } from './lib/http';
export { MAX_CIPHERTEXT_LENGTH } from './lib/validation';
export type {
  AssetsBinding,
  D1Like,
  D1Statement,
  RateLimitBinding,
  RedirectDeps,
  RedirectEnv,
  TurnstileOutcome,
  TurnstileVerifier,
  WaitUntilContext,
  WorkerEnv,
} from './lib/types';
