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

import { vi } from 'vitest';
import { encryptUrl, generateDecryptionKey } from '@/utils/encryption';
import { MemoryRateLimiter, type RedirectDeps, type RedirectEnv, type TurnstileVerifier } from '../index';
import { MockD1Database } from '../dev';

const ORIGIN = 'https://qrcraftly.com';
const BASE = 'https://qrcraftly.com';

/** Test-only Turnstile verifier: tokens are injected here, never in production code. */
function acceptingVerifier() {
  return vi.fn<TurnstileVerifier>(async () => ({ ok: true }));
}

export interface Harness {
  db: MockD1Database;
  env: RedirectEnv;
  deps: RedirectDeps;
  verify: ReturnType<typeof acceptingVerifier>;
}

/** Fully configured bindings with generous limits. */
export function harness(overrides: Partial<RedirectEnv> = {}): Harness {
  const db = new MockD1Database();
  const verify = acceptingVerifier();
  return {
    db,
    verify,
    env: {
      DB: db,
      TURNSTILE_SECRET_KEY: 'test-secret',
      WRITE_RATE_LIMITER: new MemoryRateLimiter(1000, 60_000),
      READ_RATE_LIMITER: new MemoryRateLimiter(1000, 60_000),
      ...overrides,
    },
    deps: { verifyTurnstile: verify, fallbackReadLimiter: new MemoryRateLimiter(1000, 60_000) },
  };
}

/** Builds a JSON POST as a browser on the production origin would send it. */
export function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'CF-Connecting-IP': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/** Builds a GET from a scanner. */
export function get(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}${path}`, { headers: { 'CF-Connecting-IP': '198.51.100.4', ...headers } });
}

/** Real client-side ciphertext for a destination. */
export async function cipher(url: string, key?: string): Promise<{ key: string; value: string }> {
  const k = key ?? (await generateDecryptionKey());
  return { key: k, value: await encryptUrl(url, k) };
}
