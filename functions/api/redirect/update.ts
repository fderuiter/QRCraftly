import { SafeUrlPipeline } from "../../../src/utils/url";

interface Env {
  REDIRECTS_KV?: any;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  try {
    const { id, adminKey, newUrl } = await context.request.json() as { id: string, adminKey: string, newUrl: string };
    if (!id || !adminKey || !newUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (SafeUrlPipeline.isDangerous(newUrl)) {
      return new Response(JSON.stringify({ error: "Unsafe or dangerous redirect URL scheme detected" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const kv = context.env.REDIRECTS_KV;
    let dataStr: string | null = null;

    if (!kv) {
      // Local/Dev Fallback
      dataStr = (globalThis as any).__mockKV?.get(`redirect:${id}`) || null;
    } else {
      dataStr = await kv.get(`redirect:${id}`);
    }

    if (!dataStr) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = JSON.parse(dataStr);
    if (data.adminKey !== adminKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    data.redirectUrl = newUrl;

    if (!kv) {
      if (!(globalThis as any).__mockKV) {
        (globalThis as any).__mockKV = new Map<string, string>();
      }
      (globalThis as any).__mockKV.set(`redirect:${id}`, JSON.stringify(data));
    } else {
      await kv.put(`redirect:${id}`, JSON.stringify(data));
    }

    return new Response(JSON.stringify({ success: true, redirectUrl: newUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
