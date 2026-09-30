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

import type { RateLimitBinding } from './types';

/**
 * Fixed-window, per-isolate rate limiter with a hard cap on tracked keys.
 *
 * Used as the local dev limiter and as the best-effort read fallback when the
 * Cloudflare `READ_RATE_LIMITER` binding is absent. It is bounded: once
 * `maxKeys` clients are tracked, the oldest window is evicted, so random client
 * keys cannot grow isolate memory without limit.
 */
export class MemoryRateLimiter implements RateLimitBinding {
  private readonly windows = new Map<string, { start: number; count: number }>();

  /**
   * @param maxRequests - Requests allowed per window.
   * @param periodMs - Window length in milliseconds.
   * @param maxKeys - Maximum number of tracked keys.
   * @param now - Clock (injectable for tests).
   */
  constructor(
    private readonly maxRequests: number,
    private readonly periodMs: number,
    private readonly maxKeys = 1000,
    private readonly now: () => number = Date.now,
  ) {}

  /** Number of keys currently tracked (exposed for bound assertions). */
  get size(): number {
    return this.windows.size;
  }

  /**
   * Records one request for `key`.
   * @param options - Binding-compatible options.
   * @param options.key - Client key (route and IP).
   * @returns Whether the request is within the limit.
   */
  async limit({ key }: { key: string }): Promise<{ success: boolean }> {
    const now = this.now();
    const current = this.windows.get(key);
    if (current && now - current.start < this.periodMs) {
      current.count += 1;
      return { success: current.count <= this.maxRequests };
    }
    this.windows.delete(key);
    if (this.windows.size >= this.maxKeys) {
      const oldest = this.windows.keys().next();
      if (!oldest.done) this.windows.delete(oldest.value);
    }
    this.windows.set(key, { start: now, count: 1 });
    return { success: 1 <= this.maxRequests };
  }
}

/** Read fallback shared by the isolate: 120 lookups per minute per client, 1000 tracked clients. */
export const defaultFallbackReadLimiter = new MemoryRateLimiter(120, 60_000, 1000);

/** Result of applying a limiter to a request. */
export type LimitDecision = 'allowed' | 'limited' | 'unavailable';

/**
 * Applies a limiter, treating a binding failure as "unavailable" rather than
 * throwing, so callers can decide how to fail without ever returning a 5xx.
 * @param limiter - Binding or fallback limiter, if any.
 * @param key - Rate-limit key.
 * @returns The decision.
 */
export async function applyLimit(limiter: RateLimitBinding | undefined, key: string): Promise<LimitDecision> {
  if (!limiter) return 'unavailable';
  try {
    const { success } = await limiter.limit({ key });
    return success ? 'allowed' : 'limited';
  } catch {
    return 'unavailable';
  }
}
