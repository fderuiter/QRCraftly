export interface RedirectRecord {
  id: string;
  redirect_url: string;
  admin_key: string;
  scans: number;
  created_at: string;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<_T = Record<string, unknown>>(): Promise<{ success: boolean; meta?: any }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec?(query: string): Promise<{ count?: number; duration?: number }>;
}

export interface Env {
  DB?: D1Database;
  REDIRECTS_DB?: D1Database;
  REDIRECTS_KV?: any;
}

/**
 * In-memory Mock D1 Database for offline local development and unit testing.
 * Operates relationally in memory and supports atomic updates.
 */
export class MockD1Database implements D1Database {
  private kvFallback?: any;

  constructor(kvFallback?: any) {
    this.kvFallback = kvFallback;
  }

  private getStore(): Map<string, RedirectRecord> {
    if (!(globalThis as any).__mockDBStore) {
      (globalThis as any).__mockDBStore = new Map<string, RedirectRecord>();
    }
    return (globalThis as any).__mockDBStore;
  }

  prepare(query: string): D1PreparedStatement {
    const trimmed = query.trim();
    let boundValues: any[] = [];
    const getStore = () => this.getStore();
    const kvFallback = this.kvFallback;

    const stmt: D1PreparedStatement = {
      bind(...values: any[]) {
        boundValues = values;
        return stmt;
      },
      async first<T = unknown>(colName?: string): Promise<T | null> {
        const store = getStore();
        if (trimmed.toUpperCase().startsWith("SELECT")) {
          const id = boundValues[0];
          let record = store.get(id) || null;

          if (!record && kvFallback) {
            try {
              const rawStr = await kvFallback.get(`redirect:${id}`);
              if (rawStr) {
                const raw = typeof rawStr === "string" ? JSON.parse(rawStr) : rawStr;
                record = {
                  id: raw.id,
                  redirect_url: raw.redirectUrl || raw.redirect_url,
                  admin_key: raw.adminKey || raw.admin_key,
                  scans: typeof raw.scans === "number" ? raw.scans : (parseInt(raw.scans, 10) || 0),
                  created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
                };
                store.set(id, record);
              }
            } catch (_) {}
          }

          if (!record && (globalThis as any).__mockKV?.has(`redirect:${id}`)) {
            try {
              const raw = JSON.parse((globalThis as any).__mockKV.get(`redirect:${id}`));
              record = {
                id: raw.id,
                redirect_url: raw.redirectUrl || raw.redirect_url,
                admin_key: raw.adminKey || raw.admin_key,
                scans: typeof raw.scans === "number" ? raw.scans : (parseInt(raw.scans, 10) || 0),
                created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
              };
              store.set(id, record);
            } catch (_) {}
          }

          if (!record) return null;

          if (colName) {
            return (record as any)[colName] ?? null;
          }
          if (trimmed.includes("SELECT redirect_url FROM")) {
            return { redirect_url: record.redirect_url } as unknown as T;
          }
          if (trimmed.includes("SELECT admin_key FROM")) {
            return { admin_key: record.admin_key } as unknown as T;
          }
          return {
            id: record.id,
            redirect_url: record.redirect_url,
            admin_key: record.admin_key,
            scans: record.scans,
            created_at: record.created_at,
          } as unknown as T;
        }
        return null;
      },
      async run(): Promise<{ success: boolean; meta?: any }> {
        const store = getStore();
        if (trimmed.toUpperCase().startsWith("INSERT")) {
          let id: string, redirect_url: string, admin_key: string, scansVal: any, created_at: string;
          if (boundValues.length >= 5) {
            [id, redirect_url, admin_key, scansVal, created_at] = boundValues;
          } else {
            [id, redirect_url, admin_key, created_at] = boundValues;
            scansVal = 0;
          }
          const numericScans = typeof scansVal === "number" ? scansVal : (parseInt(scansVal, 10) || 0);
          const record: RedirectRecord = {
            id,
            redirect_url,
            admin_key,
            scans: numericScans,
            created_at: created_at || new Date().toISOString(),
          };
          store.set(id, record);
          await syncToLegacyKV(record);
          return { success: true };
        }
        if (trimmed.toUpperCase().startsWith("UPDATE")) {
          if (trimmed.includes("scans = scans + 1")) {
            const id = boundValues[0];
            let record = store.get(id);

            if (!record && kvFallback) {
              try {
                const rawStr = await kvFallback.get(`redirect:${id}`);
                if (rawStr) {
                  const raw = typeof rawStr === "string" ? JSON.parse(rawStr) : rawStr;
                  record = {
                    id: raw.id,
                    redirect_url: raw.redirectUrl || raw.redirect_url,
                    admin_key: raw.adminKey || raw.admin_key,
                    scans: typeof raw.scans === "number" ? raw.scans : (parseInt(raw.scans, 10) || 0),
                    created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
                  };
                }
              } catch (_) {}
            }

            if (!record && (globalThis as any).__mockKV?.has(`redirect:${id}`)) {
              try {
                const raw = JSON.parse((globalThis as any).__mockKV.get(`redirect:${id}`));
                record = {
                  id: raw.id,
                  redirect_url: raw.redirectUrl || raw.redirect_url,
                  admin_key: raw.adminKey || raw.admin_key,
                  scans: typeof raw.scans === "number" ? raw.scans : (parseInt(raw.scans, 10) || 0),
                  created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
                };
              } catch (_) {}
            }

            if (record) {
              const currentScans = typeof record.scans === "number" ? record.scans : (parseInt(record.scans, 10) || 0);
              record.scans = currentScans + 1;
              store.set(id, record);
              await syncToLegacyKV(record);
            }
            return { success: true };
          }
          if (trimmed.includes("redirect_url = ?")) {
            const [newUrl, id] = boundValues;
            let record = store.get(id);

            if (!record && kvFallback) {
              try {
                const rawStr = await kvFallback.get(`redirect:${id}`);
                if (rawStr) {
                  const raw = typeof rawStr === "string" ? JSON.parse(rawStr) : rawStr;
                  record = {
                    id: raw.id,
                    redirect_url: raw.redirectUrl || raw.redirect_url,
                    admin_key: raw.adminKey || raw.admin_key,
                    scans: typeof raw.scans === "number" ? raw.scans : (parseInt(raw.scans, 10) || 0),
                    created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
                  };
                }
              } catch (_) {}
            }

            if (record) {
              record.redirect_url = newUrl;
              store.set(id, record);
              await syncToLegacyKV(record);
            }
            return { success: true };
          }
        }
        return { success: true };
      },
      async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }> {
        const store = getStore();
        if (trimmed.toUpperCase().startsWith("SELECT")) {
          const id = boundValues[0];
          let record = store.get(id);

          if (!record && kvFallback) {
            try {
              const rawStr = await kvFallback.get(`redirect:${id}`);
              if (rawStr) {
                const raw = typeof rawStr === "string" ? JSON.parse(rawStr) : rawStr;
                record = {
                  id: raw.id,
                  redirect_url: raw.redirectUrl || raw.redirect_url,
                  admin_key: raw.adminKey || raw.admin_key,
                  scans: typeof raw.scans === "number" ? raw.scans : (parseInt(raw.scans, 10) || 0),
                  created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
                };
                store.set(id, record);
              }
            } catch (_) {}
          }

          const results = record ? [record as unknown as T] : [];
          return { results, success: true };
        }
        return { results: [], success: true };
      },
    };

    async function syncToLegacyKV(record: RedirectRecord) {
      const payload = JSON.stringify({
        id: record.id,
        redirectUrl: record.redirect_url,
        adminKey: record.admin_key,
        scans: record.scans,
        createdAt: record.created_at,
      });

      if ((globalThis as any).__mockKV) {
        (globalThis as any).__mockKV.set(`redirect:${record.id}`, payload);
      }
      if (kvFallback) {
        try {
          await kvFallback.put(`redirect:${record.id}`, payload);
        } catch (_) {}
      }
    }

    return stmt;
  }
}

const initializedDBs = new WeakSet<object>();

/**
 * Ensures the relational schema is initialized on the target D1 database.
 * @param db The Cloudflare D1 database instance
 */
export async function ensureTableExists(db: D1Database): Promise<void> {
  if (initializedDBs.has(db)) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS redirects (
          id TEXT PRIMARY KEY,
          redirect_url TEXT NOT NULL,
          admin_key TEXT NOT NULL,
          scans INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        )`
      )
      .run();
    initializedDBs.add(db);
  } catch (err) {
    console.error("[D1 Init Error]", err);
  }
}

/**
 * Resolves the active D1 database handle from environment bindings,
 * falling back to local offline MockD1Database when un-bound.
 * @param env Cloudflare Pages Function Environment bindings
 */
export function getDB(env?: Env): { db: D1Database; isRealD1: boolean } {
  if (env?.DB) {
    return { db: env.DB, isRealD1: true };
  }
  if (env?.REDIRECTS_DB) {
    return { db: env.REDIRECTS_DB, isRealD1: true };
  }
  if (env?.REDIRECTS_KV) {
    return { db: new MockD1Database(env.REDIRECTS_KV), isRealD1: false };
  }
  if (!(globalThis as any).__mockD1Instance) {
    (globalThis as any).__mockD1Instance = new MockD1Database();
  }
  return { db: (globalThis as any).__mockD1Instance, isRealD1: false };
}
