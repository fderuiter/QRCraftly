import { getDB, ensureTableExists, Env } from "./_db";

/**
 * Handles fetching aggregated scan statistics and trend analytics for a dynamic redirect ID.
 * Queries D1 for base redirect metadata, and queries KV keys matching the prefix 'event:{id}:'
 * to calculate total count, hourly/daily trends, device breakdown, and location stats.
 */
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
      .prepare("SELECT * FROM redirects WHERE id = ?")
      .bind(id)
      .first<any>();

    if (!record) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const redirectUrl = record.redirect_url || record.redirectUrl;
    const createdAt = record.created_at || record.createdAt;
    const iosUrl = record.ios_url || record.iosUrl;
    const androidUrl = record.android_url || record.androidUrl;

    const totalScans = typeof record.scans === "number" ? record.scans : (parseInt(record.scans, 10) || 0);

    return new Response(JSON.stringify({
      id,
      scans: totalScans,
      redirectUrl,
      originalUrl: redirectUrl,
      createdAt,
      iosUrl,
      androidUrl
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
