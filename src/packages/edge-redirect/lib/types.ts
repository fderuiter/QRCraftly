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
 * Structural subset of the Cloudflare D1 API used by the redirect engine.
 * Declared locally so the package needs no `@cloudflare/workers-types` dependency;
 * a real `D1Database` binding satisfies it.
 */
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

/** Structural subset of a Cloudflare D1 database binding. */
export interface D1Like {
  prepare(query: string): D1Statement;
}

/** Structural subset of the Cloudflare Workers Rate Limiting binding (`ratelimits` in wrangler.jsonc). */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Structural subset of the Workers Static Assets binding. */
export interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

/** Structural subset of the Workers `ExecutionContext`. */
export interface WaitUntilContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Environment bindings consumed by the dynamic redirect API.
 * Every binding is optional: the engine degrades to a safe 4xx/503 answer
 * instead of crashing when one is missing.
 */
export interface RedirectEnv {
  /** Cloudflare D1 database holding the `redirects` table (see `schema.sql`). */
  DB?: D1Like;
  /** Turnstile secret. When unset, registration fails closed. */
  TURNSTILE_SECRET_KEY?: string;
  /** Rate Limiting binding applied to register and update. Missing: writes fail closed. */
  WRITE_RATE_LIMITER?: RateLimitBinding;
  /** Rate Limiting binding applied to lookups, stats and `/r/:id`. Missing: bounded in-isolate fallback. */
  READ_RATE_LIMITER?: RateLimitBinding;
  /** Optional comma-separated list of extra origins allowed to call write endpoints. */
  ALLOWED_ORIGINS?: string;
}

/** Environment of the Worker entry: redirect bindings plus the static assets binding. */
export interface WorkerEnv extends RedirectEnv {
  ASSETS: AssetsBinding;
}

/** Outcome of a Turnstile verification. */
export type TurnstileOutcome =
  | { ok: true }
  | { ok: false; status: 400 | 403 | 503; error: string };

/** Verifies a Turnstile token against a secret. Injectable for tests and the local dev server. */
export type TurnstileVerifier = (token: string, secret: string, remoteIp: string | null) => Promise<TurnstileOutcome>;

/** Optional collaborators injected by tests and the Vite dev middleware. */
export interface RedirectDeps {
  /** Replaces the Cloudflare siteverify call. */
  verifyTurnstile?: TurnstileVerifier;
  /** Limiter used for reads when `READ_RATE_LIMITER` is not bound. */
  fallbackReadLimiter?: RateLimitBinding;
}
