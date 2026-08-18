import { validateUrl } from "./register";
import { isEncrypted } from "../../../src/utils/encryption";
import { getDB, ensureTableExists, Env } from "./_db";

const globalMockKV = new Map<string, string>();

/**
 * Handles incoming redirection requests.
 * Records scan event details under a unique key prefixed with the redirect ID in KV,
 * and atomically increments the total scan counter in D1.
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

  const { db, isRealD1 } = getDB(context.env);
  if (isRealD1) {
    await ensureTableExists(db);
  }

  try {
    const record = await db
      .prepare("SELECT * FROM redirects WHERE id = ?")
      .bind(id)
      .first<any>();

    if (!record) {
      return new Response("Dynamic redirect ID not found", { status: 404 });
    }

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

    const updatePromise = (async () => {
      try {
        await db
          .prepare("UPDATE redirects SET scans = scans + 1 WHERE id = ?")
          .bind(id)
          .run();

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

    // Return JSON payload if encrypted ciphertext or explicitly requested
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
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
