import { validateUrl } from "./register";

interface Env {
  REDIRECTS_KV?: any;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  try {
    const { id, adminKey, newUrl, redirectUrl, iosUrl, androidUrl } = await context.request.json() as {
      id: string;
      adminKey: string;
      newUrl?: string;
      redirectUrl?: string;
      iosUrl?: string;
      androidUrl?: string;
    };
    const targetNewUrl = newUrl || redirectUrl;
    if (!id || !adminKey || !targetNewUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const validation = validateUrl(targetNewUrl);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (iosUrl && iosUrl.trim() !== "") {
      const iosValidation = validateUrl(iosUrl.trim());
      if (!iosValidation.valid) {
        return new Response(JSON.stringify({ error: `iOS URL: ${iosValidation.error}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (androidUrl && androidUrl.trim() !== "") {
      const androidValidation = validateUrl(androidUrl.trim());
      if (!androidValidation.valid) {
        return new Response(JSON.stringify({ error: `Android URL: ${androidValidation.error}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
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

    data.redirectUrl = targetNewUrl;
    if (iosUrl !== undefined) {
      data.iosUrl = iosUrl && iosUrl.trim() !== "" ? iosUrl.trim() : undefined;
    }
    if (androidUrl !== undefined) {
      data.androidUrl = androidUrl && androidUrl.trim() !== "" ? androidUrl.trim() : undefined;
    }

    if (!kv) {
      if (!(globalThis as any).__mockKV) {
        (globalThis as any).__mockKV = new Map<string, string>();
      }
      (globalThis as any).__mockKV.set(`redirect:${id}`, JSON.stringify(data));
    } else {
      await kv.put(`redirect:${id}`, JSON.stringify(data));
    }

    return new Response(JSON.stringify({
      success: true,
      redirectUrl: targetNewUrl,
      iosUrl: data.iosUrl,
      androidUrl: data.androidUrl
    }), {
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
