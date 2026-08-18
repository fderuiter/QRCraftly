import { SafeUrlPipeline } from "../../../src/utils/url";
import { isEncrypted } from "../../../src/utils/encryption";
import { getDB, ensureTableExists, Env } from "./_db";
import { validateTurnstileToken, checkUrlReputation, deobfuscateUrl } from "../../../src/utils/reputation";

export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (typeof url !== "string" || !url.trim()) {
    return { valid: false, error: "Invalid URL format" };
  }

  if (SafeUrlPipeline.isDangerous(url)) {
    return { valid: false, error: `Unsafe or dangerous redirect URL scheme detected (Blocked dangerous URL scheme: "${url}")` };
  }

  const controlCharRegex = /[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/;
  if (controlCharRegex.test(url)) {
    return { valid: false, error: "URL contains invalid control characters or zero-width spaces" };
  }

  // If payload is encrypted ciphertext, validate its format without attempting URL parsing
  if (isEncrypted(url)) {
    const parts = url.split(":");
    if (parts.length === 4 && /^[a-fA-F0-9]+$/.test(parts[2]) && /^[a-fA-F0-9]+$/.test(parts[3])) {
      return { valid: true };
    }
    return { valid: false, error: "Invalid encrypted payload format" };
  }

  // Handle de-obfuscation if url is encoded
  const deob = deobfuscateUrl(url);
  // Use deobfuscatedUrl only if it already contains an explicit protocol scheme after decoding, otherwise test raw url
  const urlToParse = deob.deobfuscatedUrl && /^[a-zA-Z0-9+-.]+:\/\//.test(deob.deobfuscatedUrl)
    ? deob.deobfuscatedUrl
    : url;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlToParse);
  } catch (_err) {
    return { valid: false, error: "Invalid URL format" };
  }

  const scheme = parsedUrl.protocol.toLowerCase();

  const dangerousSchemes = ["javascript:", "data:", "file:", "vbscript:", "blob:"];
  if (dangerousSchemes.includes(scheme)) {
    return { valid: false, error: `Unsafe or dangerous redirect URL scheme detected (Blocked dangerous URL scheme: "${scheme}")` };
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
    const body = await context.request.json() as {
      redirectUrl: string;
      iosUrl?: string;
      androidUrl?: string;
      turnstileToken?: string;
      turnstile_token?: string;
      "cf-turnstile-response"?: string;
    };

    const clientIp = context.request.headers.get("CF-Connecting-IP") || undefined;
    const token = body.turnstileToken || body.turnstile_token || body["cf-turnstile-response"];

    // 1. Requirement 1 & 2: Turnstile Bot Challenge Verification
    // Guardrail: Turnstile verification failures must block processing before calling external threat intelligence services.
    const turnstileResult = await validateTurnstileToken(token, context.env, clientIp);
    if (!turnstileResult.success) {
      return new Response(JSON.stringify({ error: turnstileResult.error || "Turnstile challenge verification failed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { redirectUrl, iosUrl, androidUrl } = body;
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

    // 2. Requirement 3, 4 & 5: Synchronous URL De-obfuscation & External Threat Intelligence Check
    const reputationResult = await checkUrlReputation(redirectUrl, context.env);
    if (!reputationResult.safe) {
      return new Response(JSON.stringify({ error: reputationResult.reason || "Registration failed: Destination domain is flagged as malicious" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (cleanIosUrl) {
      const iosReputation = await checkUrlReputation(cleanIosUrl, context.env);
      if (!iosReputation.safe) {
        return new Response(JSON.stringify({ error: `iOS Destination: ${iosReputation.reason}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (cleanAndroidUrl) {
      const androidReputation = await checkUrlReputation(cleanAndroidUrl, context.env);
      if (!androidReputation.safe) {
        return new Response(JSON.stringify({ error: `Android Destination: ${androidReputation.reason}` }), {
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
