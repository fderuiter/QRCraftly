import { validateUrl } from "./register";
import { isEncrypted } from "../../../src/utils/encryption";
import { getDB, ensureTableExists, Env } from "./_db";

const globalMockKV = new Map<string, string>();

/**
 * Retrieves redirect metadata from KV edge cache (or mock KV).
 */
async function getFromKVCache(id: string, env?: Env): Promise<any | null> {
  const key = `redirect:${id}`;
  if (env?.REDIRECTS_KV) {
    try {
      const raw = await env.REDIRECTS_KV.get(key);
      if (raw) {
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      }
      return null;
    } catch (e) {
      console.error("KV edge cache read error:", e);
    }
  }

  if ((globalThis as any).__mockKV) {
    try {
      const raw = (globalThis as any).__mockKV.get(key);
      if (raw) {
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      }
    } catch (_) {}
  }

  if (globalMockKV.has(key)) {
    try {
      const raw = globalMockKV.get(key);
      if (raw) {
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Writes retrieved redirect metadata into global KV edge cache.
 */
async function putToKVCache(id: string, record: any, env?: Env): Promise<void> {
  const key = `redirect:${id}`;
  const payload = {
    id: record.id,
    redirectUrl: record.redirect_url || record.redirectUrl,
    adminKey: record.admin_key || record.adminKey,
    scans: typeof record.scans === "number" ? record.scans : (parseInt(record.scans, 10) || 0),
    createdAt: record.created_at || record.createdAt || new Date().toISOString(),
    iosUrl: record.ios_url || record.iosUrl || undefined,
    androidUrl: record.android_url || record.androidUrl || undefined,
  };
  const jsonStr = JSON.stringify(payload);

  try {
    if (env?.REDIRECTS_KV) {
      await env.REDIRECTS_KV.put(key, jsonStr);
    }
  } catch (e) {
    console.error("KV edge cache write error:", e);
  }

  if ((globalThis as any).__mockKV) {
    try {
      (globalThis as any).__mockKV.set(key, jsonStr);
    } catch (_) {}
  }

  try {
    globalMockKV.set(key, jsonStr);
  } catch (_) {}
}

/**
 * Handles incoming redirection requests.
 * Checks global KV edge cache first; falls back to primary D1 SQL database on cache misses
 * or to KV on D1 database errors/timeouts.
 */
export const onRequestGet = async (context: {
  request: Request;
  env: Env;
  params: { id: string };
  waitUntil?: (promise: Promise<any>) => void;
}) => {
  const { id } = context.params;
  const userAgent = context.request.headers.get('user-agent') || '';
  const acceptHeader = context.request.headers.get('accept') || '';
  const requestUrl = new URL(context.request.url);
  const wantsJson = acceptHeader.includes('application/json') || requestUrl.searchParams.get('json') === '1';

  const resolveTargetUrl = (record: any): string => {
    const isIos = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const iosUrl = record.ios_url || record.iosUrl;
    const androidUrl = record.android_url || record.androidUrl;
    const redirectUrl = record.redirect_url || record.redirectUrl;

    if (isIos && iosUrl && typeof iosUrl === 'string' && iosUrl.trim() !== '') {
      return iosUrl.trim();
    }
    if (isAndroid && androidUrl && typeof androidUrl === 'string' && androidUrl.trim() !== '') {
      return androidUrl.trim();
    }
    return redirectUrl;
  };

  const renderSecureErrorPage = () => {
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Security Alert</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 50px; background: #f8f9fa; color: #333; }
    .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; max-width: 500px; text-align: left; }
    h1 { color: #dc3545; margin-top: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Security Warning</h1>
    <p>This redirect has been blocked because the destination URL contains an unsafe or dangerous protocol scheme.</p>
  </div>
</body>
</html>`,
      {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  };

  let record: any = null;

  // Requirement 1: Check KV Edge Cache prior to querying primary SQL database
  record = await getFromKVCache(id, context.env);

  // Requirement 2 & 5: If cache miss, query primary SQL database (D1) with fallback
  if (!record) {
    try {
      const { db, isRealD1 } = getDB(context.env);
      if (isRealD1) {
        await ensureTableExists(db);
      }
      record = await db
        .prepare("SELECT * FROM redirects WHERE id = ?")
        .bind(id)
        .first<any>();

      // Populate KV edge cache after database cache miss
      if (record) {
        await putToKVCache(id, record, context.env);
      }
    } catch (dbErr) {
      console.error("D1 primary database query failed, falling back to KV edge cache:", dbErr);
      // Requirement 5: Fall back to reading from KV edge cache when database query fails or times out
      record = await getFromKVCache(id, context.env);
    }
  }

  if (!record) {
    return new Response("Dynamic redirect ID not found", { status: 404 });
  }

  // Requirement 3: Dynamically evaluate device rules against cached metadata
  const targetUrl = resolveTargetUrl(record);

  if (!targetUrl || !validateUrl(targetUrl).valid) {
    return renderSecureErrorPage();
  }

  const timestamp = new Date().toISOString();
  const eventId = crypto.randomUUID();

  let device: 'mobile' | 'desktop' | 'tablet' | 'other' = 'desktop';
  if (/ipad|tablet/i.test(userAgent)) {
    device = 'tablet';
  } else if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    device = 'mobile';
  }

  const cf = (context.request as any).cf;
  const country = cf?.country || context.request.headers.get("cf-ipcountry") || "Unknown";
  const region = cf?.region || context.request.headers.get("cf-region") || "Unknown";
  const city = cf?.city || context.request.headers.get("cf-ipcity") || "Unknown";

  const event = {
    id: eventId,
    redirectId: id,
    timestamp,
    userAgent: userAgent || "Unknown",
    device,
    location: { country, region, city }
  };

  const eventKey = `event:${id}:${timestamp}:${eventId}`;

  // Requirement 6: Non-blocking background telemetry & scan count processing
  const updatePromise = (async () => {
    try {
      try {
        const { db } = getDB(context.env);
        await db
          .prepare("UPDATE redirects SET scans = scans + 1 WHERE id = ?")
          .bind(id)
          .run();
      } catch (d1Err) {
        console.error("Asynchronous D1 scan count update failed (fail-open):", d1Err);
      }

      const kv = context.env.REDIRECTS_KV;
      if (kv) {
        await kv.put(eventKey, JSON.stringify(event), { metadata: event });
      } else if ((globalThis as any).__mockKV) {
        (globalThis as any).__mockKV.set(eventKey, JSON.stringify(event));
      } else {
        globalMockKV.set(eventKey, JSON.stringify(event));
      }
    } catch (err) {
      console.error("Asynchronous scan tracking failed:", err);
    }
  })();

  if (context.waitUntil) {
    context.waitUntil(updatePromise);
  } else {
    await updatePromise;
  }

  // Requirement 4: Support both HTTP 307 redirect responses and HTTP 200 JSON payloads
  if (wantsJson || isEncrypted(targetUrl)) {
    return new Response(
      JSON.stringify({
        id: record.id,
        redirectUrl: record.redirect_url || record.redirectUrl,
        iosUrl: record.ios_url || record.iosUrl || undefined,
        androidUrl: record.android_url || record.androidUrl || undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  return Response.redirect(targetUrl, 307);
};
