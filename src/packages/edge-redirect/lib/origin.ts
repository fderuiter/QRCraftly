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
 * Origins allowed to call write endpoints in addition to the request's own origin:
 * the custom production domain, the production workers.dev host and the `dev`
 * preview staging host (ADR 0012).
 */
export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  'https://qrcraftly.com',
  'https://qrcraftly.fpderuiter.workers.dev',
  'https://dev-qrcraftly.fpderuiter.workers.dev',
];

/**
 * Resolves the calling origin from `Origin`, falling back to the `Referer` origin.
 * @param request - Incoming request.
 * @returns The origin, or null when neither header yields one.
 */
function callerOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (origin && origin !== 'null') return origin;
  const referer = request.headers.get('Referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Checks that a write request comes from a page served by QRCraftly: the same
 * origin as the request (covers branch previews and local dev), one of
 * {@link DEFAULT_ALLOWED_ORIGINS}, or an origin listed in `ALLOWED_ORIGINS`.
 * Requests without any Origin or Referer are rejected.
 * @param request - Incoming request.
 * @param extraOrigins - Comma-separated extra origins from the environment.
 * @returns Whether the origin is allowed.
 */
export function isAllowedOrigin(request: Request, extraOrigins?: string): boolean {
  const origin = callerOrigin(request);
  if (!origin) return false;
  if (origin === new URL(request.url).origin) return true;
  if (DEFAULT_ALLOWED_ORIGINS.includes(origin)) return true;
  const extras = (extraOrigins || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return extras.includes(origin);
}
