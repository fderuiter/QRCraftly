import { Env } from "./_db";

async function getKVCount(kv: any, key: string): Promise<number> {
  let val: string | null = null;
  const store = kv || (globalThis as any).__mockKV;
  if (!store) return 0;

  if (store instanceof Map) {
    val = store.get(key) ?? null;
  } else if (typeof store.get === "function") {
    val = await store.get(key);
  }

  if (!val) return 0;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
}

async function putKVCount(kv: any, key: string, count: number): Promise<void> {
  const strVal = String(count);
  const store = kv || (globalThis as any).__mockKV;
  if (!store) return;

  if (store instanceof Map) {
    store.set(key, strVal);
  } else if (typeof store.put === "function") {
    await store.put(key, strVal, { expirationTtl: 120 });
  }
}

export const onRequest = async (context: {
  request: Request;
  next: () => Promise<Response>;
  env: Env;
}) => {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Enforce middleware protection on registration endpoint
  if (request.method === "POST" && pathname === "/api/redirect/register") {
    // 1. Origin Verification
    const origin = request.headers.get("Origin");
    const referer = request.headers.get("Referer");
    let refererOrigin = "";
    if (referer) {
      try {
        refererOrigin = new URL(referer).origin;
      } catch (_) {}
    }

    const resolvedOrigin = origin || refererOrigin;
    const requestHostname = url.hostname;
    const isLocalRequest = requestHostname === "localhost" || requestHostname === "127.0.0.1";

    if (resolvedOrigin) {
      const isOfficial = resolvedOrigin === "https://qrcraftly.com";
      let isLocalOrigin = false;
      try {
        const parsedOrigin = new URL(resolvedOrigin);
        isLocalOrigin = parsedOrigin.hostname === "localhost" || parsedOrigin.hostname === "127.0.0.1";
      } catch (_) {}

      if (!isOfficial && !isLocalOrigin) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Origin not allowed" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    } else {
      // Reject empty Origin/Referer in non-local environments to prevent third-party access
      if (!isLocalRequest) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Origin or Referer header required" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // 2. IP-based Fixed-Window KV Rate Limiting
    try {
      const clientIP = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
      const currentMinuteBucket = Math.floor(Date.now() / 60000);
      const bucketKey = `ratelimit:${clientIP}:${currentMinuteBucket}`;
      const kv = context.env?.REDIRECTS_KV;

      const currentCount = await getKVCount(kv, bucketKey);

      if (currentCount >= 10) {
        return new Response(
          JSON.stringify({ error: "Too Many Requests: Rate limit exceeded. Limit is 10 requests per minute." }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      await putKVCount(kv, bucketKey, currentCount + 1);
    } catch (err) {
      // Fail-open protection: if KV interaction fails, allow request to proceed
      console.error("[KV Rate Limiter Error] Failing open:", err);
    }
  }

  return await context.next();
};

