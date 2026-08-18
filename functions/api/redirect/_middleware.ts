import { Env } from "./_db";

// In-memory cache to store timestamps of requests per IP
const ipCache = new Map<string, number[]>();

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

    // 2. IP-based Rate Limiting
    const clientIP = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    let timestamps = ipCache.get(clientIP) || [];
    timestamps = timestamps.filter((ts) => ts > oneMinuteAgo);

    if (timestamps.length >= 10) {
      return new Response(
        JSON.stringify({ error: "Too Many Requests: Rate limit exceeded. Limit is 10 requests per minute." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    timestamps.push(now);
    ipCache.set(clientIP, timestamps);
  }

  return await context.next();
};
