import { getDB, ensureTableExists, Env } from "./_db";

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
  params: { id: string };
  waitUntil?: (promise: Promise<any>) => void;
}) => {
  const { id } = context.params;
  const { db, isRealD1 } = getDB(context.env);

  if (isRealD1) {
    await ensureTableExists(db);
  }

  try {
    const record = await db
      .prepare("SELECT redirect_url FROM redirects WHERE id = ?")
      .bind(id)
      .first<{ redirect_url: string }>();

    if (!record || !record.redirect_url) {
      return new Response("Dynamic redirect ID not found", { status: 404 });
    }

    // Atomic increment query executed in non-blocking background task
    const updatePromise = (async () => {
      try {
        await db
          .prepare("UPDATE redirects SET scans = scans + 1 WHERE id = ?")
          .bind(id)
          .run();
      } catch (err) {
        console.error("Asynchronous D1 scan increment failed:", err);
      }
    })();

    if (context.waitUntil) {
      context.waitUntil(updatePromise);
    } else {
      updatePromise.catch(() => {});
    }

    return Response.redirect(record.redirect_url, 307);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

