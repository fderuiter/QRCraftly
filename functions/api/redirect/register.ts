import { SafeUrlPipeline } from "../../../src/utils/url";
import { getDB, ensureTableExists, Env } from "./_db";

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

    const cleanIosUrl = (iosUrl && iosUrl.trim() !== "") ? iosUrl.trim() : undefined;
    if (cleanIosUrl) {
      const iosValidation = validateUrl(cleanIosUrl);
      if (!iosValidation.valid) {
        return new Response(JSON.stringify({ error: `iOS URL: ${iosValidation.error}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const cleanAndroidUrl = (androidUrl && androidUrl.trim() !== "") ? androidUrl.trim() : undefined;
    if (cleanAndroidUrl) {
      const androidValidation = validateUrl(cleanAndroidUrl);
      if (!androidValidation.valid) {
        return new Response(JSON.stringify({ error: `Android URL: ${androidValidation.error}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const id = crypto.randomUUID();
    const adminKey = crypto.randomUUID().replace(/-/g, '');
    const createdAt = new Date().toISOString();

    const { db, isRealD1 } = getDB(context.env);
    if (isRealD1) {
      await ensureTableExists(db);
    }

    await db
      .prepare("INSERT INTO redirects (id, redirect_url, admin_key, scans, created_at, ios_url, android_url) VALUES (?, ?, ?, 0, ?, ?, ?)")
      .bind(id, redirectUrl, adminKey, createdAt, cleanIosUrl || null, cleanAndroidUrl || null)
      .run();

    if (!isRealD1) {
      console.log(`[Dev Redirector] Registered local mock dynamic redirect:`, {
        id,
        redirectUrl,
        adminKey,
        scans: 0,
        createdAt,
        iosUrl: cleanIosUrl,
        androidUrl: cleanAndroidUrl
      });
    }

    return new Response(JSON.stringify({
      id,
      redirectUrl,
      iosUrl: cleanIosUrl,
      androidUrl: cleanAndroidUrl,
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
