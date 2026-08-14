interface Env {
  REDIRECTS_KV?: any;
}

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
}) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id parameter" }), {
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
    return new Response(JSON.stringify({ id, scans: data.scans || 0, redirectUrl: data.redirectUrl }), {
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
