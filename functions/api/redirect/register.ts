interface Env {
  REDIRECTS_KV?: any;
}

export function validateUrl(url: string): { valid: boolean; error?: string } {
  const controlCharRegex = /[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/;
  if (controlCharRegex.test(url)) {
    return { valid: false, error: "URL contains invalid control characters or zero-width spaces" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (_err) {
    return { valid: false, error: "Invalid URL format" };
  }

  const scheme = parsedUrl.protocol;
  if (scheme !== "http:" && scheme !== "https:") {
    return { valid: false, error: `Invalid URL scheme: "${scheme}". Scheme must be http: or https:` };
  }

  const dangerousSchemes = ["javascript:", "data:", "file:", "vbscript:", "blob:"];
  if (dangerousSchemes.includes(scheme.toLowerCase())) {
    return { valid: false, error: `Blocked dangerous URL scheme: "${scheme}"` };
  }

  return { valid: true };
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

    const validation = validateUrl(redirectUrl);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
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
