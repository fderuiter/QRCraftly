import { SafeUrlPipeline } from "../../../src/utils/url";

interface Env {
  REDIRECTS_KV?: any;
}

export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (typeof url !== "string" || !url.trim()) {
    return { valid: false, error: "Invalid URL format" };
  }

  if (SafeUrlPipeline.isDangerous(url)) {
    return { valid: false, error: `Blocked dangerous URL scheme: "${url}"` };
  }

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

  const scheme = parsedUrl.protocol.toLowerCase();

  const dangerousSchemes = ["javascript:", "data:", "file:", "vbscript:", "blob:"];
  if (dangerousSchemes.includes(scheme)) {
    return { valid: false, error: `Blocked dangerous URL scheme: "${scheme}"` };
  }

  if (scheme !== "http:" && scheme !== "https:") {
    return { valid: false, error: `Invalid URL scheme: "${scheme}". Scheme must be http: or https:` };
  }

  return { valid: true };
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  try {
    const { redirectUrl, iosUrl, androidUrl } = await context.request.json() as {
      redirectUrl: string;
      iosUrl?: string;
      androidUrl?: string;
    };
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

    const id = crypto.randomUUID();
    const adminKey = crypto.randomUUID().replace(/-/g, '');
    const data: Record<string, any> = {
      id,
      redirectUrl,
      adminKey,
      scans: 0,
      createdAt: new Date().toISOString()
    };

    if (iosUrl && iosUrl.trim() !== "") {
      data.iosUrl = iosUrl.trim();
    }
    if (androidUrl && androidUrl.trim() !== "") {
      data.androidUrl = androidUrl.trim();
    }

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

    return new Response(JSON.stringify({
      id,
      redirectUrl,
      iosUrl: data.iosUrl,
      androidUrl: data.androidUrl,
      adminKey
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
