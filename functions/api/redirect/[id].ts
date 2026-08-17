import { SafeUrlPipeline } from "../../../src/utils/url";

interface Env {
  REDIRECTS_KV?: any;
}

const globalMockKV = new Map<string, string>();

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
  params: { id: string };
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
    console.log(`[Dev Redirector] KV not found. Using globalMockKV lookup for id: ${id}`);
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

    data.scans = (data.scans || 0) + 1;
    (globalThis as any).__mockKV.set(`redirect:${id}`, JSON.stringify(data));
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

    data.scans = (data.scans || 0) + 1;
    await kv.put(`redirect:${id}`, JSON.stringify(data));

    return Response.redirect(data.redirectUrl, 307);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
