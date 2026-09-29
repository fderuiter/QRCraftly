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

import { SQL } from './store';
import type { D1Like, D1Statement } from './types';

interface StoredRow {
  id: string;
  redirect_url: string;
  ios_url: string | null;
  android_url: string | null;
  admin_key_hash: string;
  scans: number;
  created_at: string;
}

type RunResult = { success: boolean; meta: { changes: number } };

/**
 * In-memory stand-in for the D1 `redirects` table, used by the Vite dev server
 * (`pnpm dev` without Cloudflare credentials) and by unit tests.
 *
 * It implements exactly the statements in the engine's `SQL` table and throws on
 * anything else, so a new query cannot silently pass locally while failing on D1.
 * State is scoped to the instance (no global singletons) and capped at `maxRows`.
 */
export class MockD1Database implements D1Like {
  private readonly rows = new Map<string, StoredRow>();

  /** @param maxRows - Maximum stored redirects; inserts beyond it fail like a full database. */
  constructor(private readonly maxRows = 10_000) {}

  /** Number of stored redirects. */
  get size(): number {
    return this.rows.size;
  }

  /**
   * Returns a copy of a stored row (for assertions and local debugging).
   * @param id - Redirect id.
   * @returns The row or undefined.
   */
  peek(id: string): Readonly<StoredRow> | undefined {
    const row = this.rows.get(id);
    return row ? { ...row } : undefined;
  }

  /**
   * Prepares one of the engine's statements.
   * @param query - SQL text; must be a value of the engine's `SQL` table.
   * @returns A bindable statement.
   */
  prepare(query: string): D1Statement {
    let values: unknown[] = [];
    const statement: D1Statement = {
      bind: (...bound: unknown[]) => {
        values = bound;
        return statement;
      },
      first: async <T,>() => this.first(query, values) as T | null,
      run: async () => this.run(query, values),
    };
    return statement;
  }

  private first(query: string, values: unknown[]): Record<string, unknown> | null {
    const row = this.rows.get(String(values[0]));
    switch (query) {
      case SQL.selectDestinations:
        return row ? { id: row.id, redirect_url: row.redirect_url, ios_url: row.ios_url, android_url: row.android_url } : null;
      case SQL.selectForUpdate:
        return row ? { admin_key_hash: row.admin_key_hash, ios_url: row.ios_url, android_url: row.android_url } : null;
      case SQL.selectStats:
        return row ? { scans: row.scans, created_at: row.created_at } : null;
      case SQL.selectExists:
        return row ? { found: 1 } : null;
      default:
        throw new Error(`MockD1Database: unsupported query: ${query}`);
    }
  }

  private run(query: string, values: unknown[]): RunResult {
    switch (query) {
      case SQL.insert: {
        const [id, redirectUrl, iosUrl, androidUrl, adminKeyHash, createdAt] = values.map((v) => (v === null ? null : String(v)));
        if (!id || !redirectUrl || !adminKeyHash || !createdAt) throw new Error('MockD1Database: NOT NULL constraint failed');
        if (this.rows.has(id)) throw new Error('MockD1Database: UNIQUE constraint failed: redirects.id');
        if (this.rows.size >= this.maxRows) throw new Error('MockD1Database: database full');
        this.rows.set(id, {
          id,
          redirect_url: redirectUrl,
          ios_url: iosUrl,
          android_url: androidUrl,
          admin_key_hash: adminKeyHash,
          scans: 0,
          created_at: createdAt,
        });
        return { success: true, meta: { changes: 1 } };
      }
      case SQL.updateDestinations: {
        const [redirectUrl, iosUrl, androidUrl, id, adminKeyHash] = values;
        const row = this.rows.get(String(id));
        if (!row || row.admin_key_hash !== adminKeyHash) return { success: true, meta: { changes: 0 } };
        row.redirect_url = String(redirectUrl);
        row.ios_url = iosUrl === null ? null : String(iosUrl);
        row.android_url = androidUrl === null ? null : String(androidUrl);
        return { success: true, meta: { changes: 1 } };
      }
      case SQL.incrementScans: {
        const row = this.rows.get(String(values[0]));
        if (!row) return { success: true, meta: { changes: 0 } };
        row.scans += 1;
        return { success: true, meta: { changes: 1 } };
      }
      default:
        throw new Error(`MockD1Database: unsupported statement: ${query}`);
    }
  }
}
