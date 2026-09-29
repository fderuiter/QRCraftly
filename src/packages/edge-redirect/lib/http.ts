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

/** Maximum accepted JSON request body, in bytes. */
export const MAX_BODY_BYTES = 16 * 1024;

/** Headers attached to every API response: never cached, never indexed. */
const API_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/**
 * Builds a JSON response carrying the standard API security headers.
 * @param body - Serializable payload.
 * @param status - HTTP status code.
 * @param extraHeaders - Additional headers (e.g. `Allow`, `Retry-After`).
 * @returns The response.
 */
export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...API_HEADERS, ...extraHeaders } });
}

/**
 * Builds a JSON error response. The message is always a fixed string chosen by
 * the engine; internal exception text is never echoed to the client.
 * @param status - HTTP status code.
 * @param error - Client-facing message.
 * @param extraHeaders - Additional headers.
 * @returns The response.
 */
export function jsonError(status: number, error: string, extraHeaders: Record<string, string> = {}): Response {
  return json({ error }, status, extraHeaders);
}

/** A parsed JSON object body, or the error response to return instead. */
export type BodyResult = { ok: true; body: Record<string, unknown> } | { ok: false; response: Response };

/**
 * Reads and parses a JSON object body with a hard size cap.
 * Rejects non-JSON content types (415), oversize bodies (413), malformed JSON
 * and non-object payloads (400).
 * @param request - Incoming request.
 * @param maxBytes - Size cap in bytes.
 * @returns The parsed body or an error response.
 */
export async function readJsonBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<BodyResult> {
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    return { ok: false, response: jsonError(415, 'Content-Type must be application/json') };
  }

  const declared = Number(request.headers.get('Content-Length') || '0');
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, response: jsonError(413, 'Request body too large') };
  }

  let raw: string;
  try {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      return { ok: false, response: jsonError(413, 'Request body too large') };
    }
    raw = new TextDecoder().decode(buffer);
  } catch {
    return { ok: false, response: jsonError(400, 'Unreadable request body') };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, response: jsonError(400, 'Malformed JSON body') };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, response: jsonError(400, 'JSON body must be an object') };
  }
  return { ok: true, body: parsed as Record<string, unknown> };
}
