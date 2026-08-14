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
    (globalThis as any).__mockKV.set(`redirect:${id}`, JSON.stringify(data));
    return Response.redirect(data.redirectUrl, 307);
  }

  try {
    const dataStr = await kv.get(`redirect:${id}`);
    if (!dataStr) {
      return new Response("Dynamic redirect ID not found", { status: 404 });
    }

    const data = JSON.parse(dataStr);
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
