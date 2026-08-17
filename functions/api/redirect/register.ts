import { SafeUrlPipeline } from "../../../src/utils/url";

interface Env {
  REDIRECTS_KV?: any;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  try {
    const { redirectUrl } = await context.request.json() as { redirectUrl: string };
    if (!redirectUrl) {
      return new Response(JSON.stringify({ error: "Missing redirectUrl" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (SafeUrlPipeline.isDangerous(redirectUrl)) {
      return new Response(JSON.stringify({ error: "Unsafe or dangerous redirect URL scheme detected" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const id = crypto.randomUUID();
    const adminKey = crypto.randomUUID().replace(/-/g, '');
    const data = {
      id,
      redirectUrl,
      adminKey,
      scans: 0,
      createdAt: new Date().toISOString()
    };

    const kv = context.env.REDIRECTS_KV;
    if (!kv) {
      // Local/Dev Fallback
      if (!(globalThis as any).__mockKV) {
        (globalThis as any).__mockKV = new Map<string, string>();
      }
      (globalThis as any).__mockKV.set(`redirect:${id}`, JSON.stringify(data));
      console.log(`[Dev Redirector] Registered local mock dynamic redirect:`, data);
    } else {
      await kv.put(`redirect:${id}`, JSON.stringify(data));
    }

    return new Response(JSON.stringify({ id, redirectUrl, adminKey }), {
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
