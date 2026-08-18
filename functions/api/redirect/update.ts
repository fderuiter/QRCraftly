import { validateUrl } from "./register";
import { getDB, ensureTableExists, Env } from "./_db";

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  try {
    const { id, adminKey, newUrl } = await context.request.json() as { id: string, adminKey: string, newUrl: string };
    if (!id || !adminKey || !newUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const validation = validateUrl(newUrl);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { db, isRealD1 } = getDB(context.env);
    if (isRealD1) {
      await ensureTableExists(db);
    }

    const record = await db
      .prepare("SELECT admin_key FROM redirects WHERE id = ?")
      .bind(id)
      .first<{ admin_key: string }>();

    if (!record) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (record.admin_key !== adminKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    await db
      .prepare("UPDATE redirects SET redirect_url = ? WHERE id = ?")
      .bind(newUrl, id)
      .run();

    return new Response(JSON.stringify({ success: true, redirectUrl: newUrl }), {
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

