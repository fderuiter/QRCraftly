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

import type { D1Like } from './types';

/** Every SQL statement the engine issues. The dev mock D1 implements exactly these. */
export const SQL = {
  insert:
    'INSERT INTO redirects (id, redirect_url, ios_url, android_url, admin_key_hash, scans, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
  selectDestinations: 'SELECT id, redirect_url, ios_url, android_url FROM redirects WHERE id = ?',
  selectForUpdate: 'SELECT admin_key_hash, ios_url, android_url FROM redirects WHERE id = ?',
  updateDestinations:
    'UPDATE redirects SET redirect_url = ?, ios_url = ?, android_url = ? WHERE id = ? AND admin_key_hash = ?',
  incrementScans: 'UPDATE redirects SET scans = scans + 1 WHERE id = ?',
  selectStats: 'SELECT scans, created_at FROM redirects WHERE id = ?',
  selectExists: 'SELECT 1 AS found FROM redirects WHERE id = ?',
} as const;

/** Ciphertext destinations of one redirect, as stored. */
export interface DestinationRow {
  id: string;
  redirect_url: string;
  ios_url: string | null;
  android_url: string | null;
}

/** Columns needed to authorize and merge an update. */
export interface UpdateRow {
  admin_key_hash: string;
  ios_url: string | null;
  android_url: string | null;
}

/** Aggregate statistics row. */
export interface StatsRow {
  scans: number;
  created_at: string;
}

/**
 * Hashes an admin key with SHA-256 so the database never stores the bearer secret itself.
 * @param adminKey - Raw admin key.
 * @returns Lowercase hex digest.
 */
export async function hashAdminKey(adminKey: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(adminKey));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Compares two strings in time independent of where they first differ.
 * @param a - First string.
 * @param b - Second string.
 * @returns Whether they are equal.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Creates a random admin key (128 bits, 32 hex characters).
 * @returns The admin key.
 */
export function createAdminKey(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/** Values of a new redirect row. */
export interface NewRedirect {
  id: string;
  redirectUrl: string;
  iosUrl: string | null;
  androidUrl: string | null;
  adminKeyHash: string;
  createdAt: string;
}

/**
 * Inserts a redirect.
 * @param db - D1 binding.
 * @param row - Values to insert.
 */
export async function insertRedirect(db: D1Like, row: NewRedirect): Promise<void> {
  await db
    .prepare(SQL.insert)
    .bind(row.id, row.redirectUrl, row.iosUrl, row.androidUrl, row.adminKeyHash, row.createdAt)
    .run();
}

/**
 * Reads the ciphertext destinations of a redirect.
 * @param db - D1 binding.
 * @param id - Redirect id.
 * @returns The row or null.
 */
export function selectDestinations(db: D1Like, id: string): Promise<DestinationRow | null> {
  return db.prepare(SQL.selectDestinations).bind(id).first<DestinationRow>();
}

/**
 * Reads the columns needed to authorize and merge an update.
 * @param db - D1 binding.
 * @param id - Redirect id.
 * @returns The row or null.
 */
export function selectForUpdate(db: D1Like, id: string): Promise<UpdateRow | null> {
  return db.prepare(SQL.selectForUpdate).bind(id).first<UpdateRow>();
}

/**
 * Replaces the destinations of a redirect, guarded by the admin key hash.
 * @param db - D1 binding.
 * @param id - Redirect id.
 * @param adminKeyHash - Hash the row must still carry.
 * @param values - New destinations.
 * @param values.redirectUrl - Default destination ciphertext.
 * @param values.iosUrl - iOS override ciphertext or null.
 * @param values.androidUrl - Android override ciphertext or null.
 * @returns Whether a row was changed.
 */
export async function updateDestinations(
  db: D1Like,
  id: string,
  adminKeyHash: string,
  values: { redirectUrl: string; iosUrl: string | null; androidUrl: string | null },
): Promise<boolean> {
  const result = await db
    .prepare(SQL.updateDestinations)
    .bind(values.redirectUrl, values.iosUrl, values.androidUrl, id, adminKeyHash)
    .run();
  return result.meta?.changes === undefined ? result.success : result.meta.changes > 0;
}

/**
 * Atomically increments the scan counter.
 * @param db - D1 binding.
 * @param id - Redirect id.
 */
export async function incrementScans(db: D1Like, id: string): Promise<void> {
  await db.prepare(SQL.incrementScans).bind(id).run();
}

/**
 * Reads aggregate statistics.
 * @param db - D1 binding.
 * @param id - Redirect id.
 * @returns The row or null.
 */
export function selectStats(db: D1Like, id: string): Promise<StatsRow | null> {
  return db.prepare(SQL.selectStats).bind(id).first<StatsRow>();
}

/**
 * Checks whether a redirect exists.
 * @param db - D1 binding.
 * @param id - Redirect id.
 * @returns Whether it exists.
 */
export async function redirectExists(db: D1Like, id: string): Promise<boolean> {
  return (await db.prepare(SQL.selectExists).bind(id).first()) !== null;
}
