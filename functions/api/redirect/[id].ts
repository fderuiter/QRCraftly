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

