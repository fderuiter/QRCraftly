import { SafeUrlPipeline } from "../../../src/utils/url";

interface Env {
  REDIRECTS_KV?: any;
}

const globalMockKV = new Map<string, string>();

/**
 * Handles incoming redirection requests.
 * Records scan event details under a unique key prefixed with the redirect ID in KV.
 * Keeps the parent redirect record immutable.
 */
export const onRequestGet = async (context: {
  request: Request;
  env: Env;
  params: { id: string };
  waitUntil?: (promise: Promise<any>) => void;
}) => {
  const { id } = context.params;
  const kv = context.env.REDIRECTS_KV;

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

  if (!kv) {
    // Local / Dev Fallback mode
    if (!(globalThis as any).__mockKV) {
      (globalThis as any).__mockKV = new Map<string, string>();
    }
    const dataStr = (globalThis as any).__mockKV.get(`redirect:${id}`) || globalMockKV.get(`redirect:${id}`);
    if (!dataStr) {
      return new Response("Dynamic redirect ID not found (Mock KV)", { status: 404 });
    }
    const data = JSON.parse(dataStr);

    if (SafeUrlPipeline.isDangerous(data.redirectUrl)) {
      return renderSecureErrorPage();
    }

    const timestamp = new Date().toISOString();
    const eventId = crypto.randomUUID();
    const userAgent = context.request.headers.get("user-agent") || "Unknown";

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
      userAgent,
      device,
      location: { country, region, city }
    };

    const eventKey = `event:${id}:${timestamp}:${eventId}`;

    const updatePromise = (async () => {
      (globalThis as any).__mockKV.set(eventKey, JSON.stringify(event));
    })();

    if (context.waitUntil) {
      context.waitUntil(updatePromise);
    } else {
      (globalThis as any).__mockKV.set(eventKey, JSON.stringify(event));
    }

    return Response.redirect(data.redirectUrl, 307);
  }

  try {
    const dataStr = await kv.get(`redirect:${id}`);
    if (!dataStr) {
      return new Response("Dynamic redirect ID not found", { status: 404 });
    }

    const data = JSON.parse(dataStr);

    if (SafeUrlPipeline.isDangerous(data.redirectUrl)) {
      return renderSecureErrorPage();
    }

    const timestamp = new Date().toISOString();
    const eventId = crypto.randomUUID();
    const userAgent = context.request.headers.get("user-agent") || "Unknown";

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
      userAgent,
      device,
      location: { country, region, city }
    };

    const eventKey = `event:${id}:${timestamp}:${eventId}`;

    const updatePromise = (async () => {
      try {
        await kv.put(eventKey, JSON.stringify(event), { metadata: event });
      } catch (err) {
        console.error("Asynchronous KV event put failed:", err);
      }
    })();

    if (context.waitUntil) {
      context.waitUntil(updatePromise);
    }

    return Response.redirect(data.redirectUrl, 307);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

