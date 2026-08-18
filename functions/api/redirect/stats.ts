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

    const kv = context.env.REDIRECTS_KV;
    const prefix = `event:${id}:`;
    const events: any[] = [];

    if (!kv) {
      // Dev mode: iterate in-memory mock Map
      const mockKV = (globalThis as any).__mockKV as Map<string, string> | undefined;
      if (mockKV) {
        for (const [key, value] of mockKV.entries()) {
          if (key.startsWith(prefix)) {
            try {
              events.push(JSON.parse(value));
            } catch (_) {}
          }
        }
      }
    } else {
      // Cloudflare KV list pagination
      let cursor: string | undefined = undefined;
      let listComplete = false;

      while (!listComplete) {
        const listResult = await kv.list({ prefix, cursor });
        const keys = listResult.keys || [];

        for (const k of keys) {
          if (k.metadata) {
            events.push(k.metadata);
          } else {
            const valStr = await kv.get(k.name);
            if (valStr) {
              try {
                events.push(JSON.parse(valStr));
              } catch (_) {}
            }
          }
        }

        listComplete = listResult.list_complete ?? true;
        cursor = listResult.cursor;
      }
    }

    // Sort events newest first
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalScans = Math.max(events.length, record.scans || 0);

    // Device breakdown
    const devices = { mobile: 0, desktop: 0, tablet: 0, other: 0 };
    events.forEach(e => {
      const dev = (e.device || 'desktop') as keyof typeof devices;
      if (devices[dev] !== undefined) {
        devices[dev]++;
      } else {
        devices.other++;
      }
    });

    // Location breakdown
    const locations: Record<string, number> = {};
    events.forEach(e => {
      const loc = e.location?.country || 'Unknown';
      locations[loc] = (locations[loc] || 0) + 1;
    });

    // Daily breakdown (YYYY-MM-DD)
    const dailyMap = new Map<string, number>();
    events.forEach(e => {
      const dateStr = e.timestamp ? e.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
    });
    const daily = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Hourly breakdown (YYYY-MM-DD THH:00)
    const hourlyMap = new Map<string, number>();
    events.forEach(e => {
      const hourStr = e.timestamp ? `${e.timestamp.slice(0, 13)}:00` : `${new Date().toISOString().slice(0, 13)}:00`;
      hourlyMap.set(hourStr, (hourlyMap.get(hourStr) || 0) + 1);
    });
    const hourly = Array.from(hourlyMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return new Response(JSON.stringify({
      id,
      scans: totalScans,
      redirectUrl,
      originalUrl: redirectUrl,
      createdAt,
      iosUrl,
      androidUrl,
      hourly,
      daily,
      devices,
      locations,
      events
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
