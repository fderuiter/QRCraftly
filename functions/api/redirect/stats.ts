import { getDB, ensureTableExists, Env } from "./_db";

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

    const { db, isRealD1 } = getDB(context.env);
    if (isRealD1) {
      await ensureTableExists(db);
    }

    const record = await db
      .prepare("SELECT id, redirect_url, scans FROM redirects WHERE id = ?")
      .bind(id)
      .first<{ id: string; redirect_url: string; scans: number }>();

    if (!record) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ id, scans: record.scans || 0, redirectUrl: record.redirect_url }), {
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

