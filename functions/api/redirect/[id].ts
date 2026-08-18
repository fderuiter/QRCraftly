interface Env {
  REDIRECTS_KV?: any;
}

const globalMockKV = new Map<string, string>();

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
  params: { id: string };
  waitUntil?: (promise: Promise<any>) => void;
}) => {
  const { id } = context.params;
  const kv = context.env.REDIRECTS_KV;
  const userAgent = context.request.headers.get('user-agent') || '';

  const resolveTargetUrl = (data: any): string => {
    const isIos = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);

    if (isIos && data.iosUrl && typeof data.iosUrl === 'string' && data.iosUrl.trim() !== '') {
      return data.iosUrl.trim();
    }
    if (isAndroid && data.androidUrl && typeof data.androidUrl === 'string' && data.androidUrl.trim() !== '') {
      return data.androidUrl.trim();
    }
    return data.redirectUrl;
  };

  if (!kv) {
    // Local / Dev Fallback mode
    console.log(`[Dev Redirector] KV not found. Using globalMockKV lookup for id: ${id}`);
    if (!(globalThis as any).__mockKV) {
      (globalThis as any).__mockKV = new Map<string, string>();
    }
    const dataStr = (globalThis as any).__mockKV.get(`redirect:${id}`) || globalMockKV.get(`redirect:${id}`);
    if (!dataStr) {
      return new Response("Dynamic redirect ID not found (Mock KV)", { status: 404 });
    }
    const data = JSON.parse(dataStr);
    data.scans = (data.scans || 0) + 1;

    const updatePromise = (async () => {
      (globalThis as any).__mockKV.set(`redirect:${id}`, JSON.stringify(data));
    })();

    if (context.waitUntil) {
      context.waitUntil(updatePromise);
    } else {
      (globalThis as any).__mockKV.set(`redirect:${id}`, JSON.stringify(data));
    }

    const targetUrl = resolveTargetUrl(data);
    return Response.redirect(targetUrl, 307);
  }

  try {
    const dataStr = await kv.get(`redirect:${id}`);
    if (!dataStr) {
      return new Response("Dynamic redirect ID not found", { status: 404 });
    }

    const data = JSON.parse(dataStr);
    data.scans = (data.scans || 0) + 1;

    const updatePromise = (async () => {
      try {
        await kv.put(`redirect:${id}`, JSON.stringify(data));
      } catch (err) {
        console.error("Asynchronous KV put failed:", err);
      }
    })();

    if (context.waitUntil) {
      context.waitUntil(updatePromise);
    }

    const targetUrl = resolveTargetUrl(data);
    return Response.redirect(targetUrl, 307);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
