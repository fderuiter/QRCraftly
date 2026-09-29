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

/** Longest plaintext destination (in bytes) the client may encrypt. */
export const MAX_PLAINTEXT_URL_BYTES = 2048;

/**
 * Longest accepted `enc:v1:` destination: prefix, 12-byte IV and the AES-GCM
 * ciphertext of a {@link MAX_PLAINTEXT_URL_BYTES} URL plus its 16-byte tag, all hex encoded.
 */
export const MAX_CIPHERTEXT_LENGTH = 'enc:v1:'.length + 24 + 1 + (MAX_PLAINTEXT_URL_BYTES + 16) * 2;

/** Longest accepted Turnstile token (Cloudflare documents a 2048 character maximum). */
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

/** `enc:v1:<24 hex IV>:<ciphertext hex, at least the 16-byte tag plus one byte>`. */
const CIPHERTEXT_PATTERN = /^enc:v1:[0-9a-f]{24}:[0-9a-f]{34,}$/i;

/** Redirect ids are server-generated RFC 4122 UUIDs. */
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Admin keys are 128-bit random values rendered as 32 hex characters. */
const ADMIN_KEY_PATTERN = /^[0-9a-f]{32}$/i;

/** Validation outcome for a single field. */
export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Checks that a value is a server-generated redirect id.
 * @param value - Candidate id.
 * @returns Whether it is a well-formed id.
 */
export function isRedirectId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/**
 * Checks that a value is a well-formed admin key.
 * @param value - Candidate admin key.
 * @returns Whether it is a well-formed admin key.
 */
export function isAdminKey(value: unknown): value is string {
  return typeof value === 'string' && ADMIN_KEY_PATTERN.test(value);
}

/**
 * Validates a required destination. The API is zero-knowledge: it accepts only
 * client-side `enc:v1:` ciphertext, so it can never be used as a plaintext open
 * redirector. Because the server cannot read ciphertext, no URL reputation check
 * runs on it (#928); the destination is vetted by the resolver page after decryption.
 * @param label - Field name used in error messages.
 * @param value - Raw JSON value.
 * @returns The ciphertext or an error.
 */
export function vetRequiredDestination(label: string, value: unknown): FieldResult<string> {
  if (typeof value !== 'string' || value.length === 0) {
    return { ok: false, error: `${label} is required and must be a string` };
  }
  if (value.length > MAX_CIPHERTEXT_LENGTH) {
    return { ok: false, error: `${label} exceeds the maximum length` };
  }
  if (!isEncrypted(value)) {
    return { ok: false, error: `${label} must be client-side encrypted (enc:v1: ciphertext); plaintext destinations are rejected` };
  }
  if (!CIPHERTEXT_PATTERN.test(value) || value.length % 2 !== 0) {
    return { ok: false, error: `${label} is not a valid enc:v1: payload` };
  }
  return { ok: true, value };
}

/**
 * Validates an optional per-platform override.
 * `undefined` means "not sent" (keep the stored value on update), `null` or `""`
 * means "clear the override", and a string must be valid ciphertext.
 * @param label - Field name used in error messages.
 * @param value - Raw JSON value.
 * @returns `undefined` (not sent), `null` (clear) or the ciphertext, or an error.
 */
export function vetOptionalDestination(label: string, value: unknown): FieldResult<string | null | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === '') return { ok: true, value: null };
  const vetted = vetRequiredDestination(label, value);
  return vetted.ok ? { ok: true, value: vetted.value } : vetted;
}

/**
 * Extracts the Turnstile token from the accepted body field names.
 * @param body - Parsed request body.
 * @returns The token or an error.
 */
export function readTurnstileToken(body: Record<string, unknown>): FieldResult<string> {
  const token = body.turnstileToken ?? body['cf-turnstile-response'];
  if (typeof token !== 'string' || token.trim() === '') {
    return { ok: false, error: 'Missing Turnstile token' };
  }
  if (token.length > MAX_TURNSTILE_TOKEN_LENGTH) {
    return { ok: false, error: 'Turnstile token exceeds the maximum length' };
  }
  return { ok: true, value: token.trim() };
}
