import { getDB, ensureTableExists, Env } from "./_db";

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
    const createdAt = new Date().toISOString();

    const { db, isRealD1 } = getDB(context.env);
    if (isRealD1) {
      await ensureTableExists(db);
    }

    await db
      .prepare("INSERT INTO redirects (id, redirect_url, admin_key, scans, created_at) VALUES (?, ?, ?, 0, ?)")
      .bind(id, redirectUrl, adminKey, createdAt)
      .run();

    if (!isRealD1) {
      console.log(`[Dev Redirector] Registered local mock dynamic redirect:`, { id, redirectUrl, adminKey, scans: 0, createdAt });
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

