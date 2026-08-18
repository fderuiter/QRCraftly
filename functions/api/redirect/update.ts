import { validateUrl } from "./register";
import { getDB, ensureTableExists, Env } from "./_db";
import { checkUrlReputation } from "../../../src/utils/reputation";

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

    // Synchronous Reputation Check on updated URL
    const reputationResult = await checkUrlReputation(targetNewUrl, context.env);
    if (!reputationResult.safe) {
      return new Response(JSON.stringify({ error: reputationResult.reason || "Update failed: Destination domain is flagged as malicious" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { db, isRealD1 } = getDB(context.env);
    if (isRealD1) {
      await ensureTableExists(db);
    }

    const record = await db
      .prepare("SELECT * FROM redirects WHERE id = ?")
      .bind(id)
      .first<any>();

    if (!record) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const storedAdminKey = record.admin_key || record.adminKey;
    if (storedAdminKey !== adminKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const finalIosUrl = iosUrl !== undefined ? (iosUrl && iosUrl.trim() !== "" ? iosUrl.trim() : null) : (record.ios_url || record.iosUrl || null);
    const finalAndroidUrl = androidUrl !== undefined ? (androidUrl && androidUrl.trim() !== "" ? androidUrl.trim() : null) : (record.android_url || record.androidUrl || null);

    await db
      .prepare("UPDATE redirects SET redirect_url = ?, ios_url = ?, android_url = ? WHERE id = ?")
      .bind(targetNewUrl, finalIosUrl, finalAndroidUrl, id)
      .run();

    if (context.env?.REDIRECTS_KV) {
      const kvPayload = {
        id,
        redirectUrl: targetNewUrl,
        adminKey: storedAdminKey,
        scans: record.scans || 0,
        createdAt: record.created_at || record.createdAt || new Date().toISOString(),
        iosUrl: finalIosUrl || undefined,
        androidUrl: finalAndroidUrl || undefined,
      };
      try {
        await context.env.REDIRECTS_KV.put(`redirect:${id}`, JSON.stringify(kvPayload));
      } catch (err) {
        console.error("KV cache update failed on link edit:", err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      redirectUrl: targetNewUrl,
      iosUrl: finalIosUrl || undefined,
      androidUrl: finalAndroidUrl || undefined
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
