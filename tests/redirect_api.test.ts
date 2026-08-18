import { describe, it, expect, beforeEach } from "vitest";
import { onRequest as middlewareOnRequest } from "../functions/api/redirect/_middleware";
import { onRequestPost as registerOnRequestPost } from "../functions/api/redirect/register";
import { onRequestPost as updateOnRequestPost } from "../functions/api/redirect/update";
import { onRequestGet as lookupOnRequestGet } from "../functions/api/redirect/[id]";
import { onRequestGet as statsOnRequestGet } from "../functions/api/redirect/stats";
import { MockD1Database } from "../functions/api/redirect/_db";

class MockKV {
  store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key) || null;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("Secure Dynamic Redirection API Suite", () => {
  beforeEach(() => {
    // Reset global mock storage instances
    (globalThis as any).__mockKV = new Map<string, string>();
    (globalThis as any).__mockDBStore = new Map<string, any>();
    delete (globalThis as any).__mockD1Instance;
  });

  describe("Middleware Origin Verification & Rate Limiting", () => {
    // Helper to run request through middleware
    const runMiddleware = async (req: Request, nextFn?: () => Promise<Response>) => {
      const defaultNext = async () => new Response("next called", { status: 200 });
      const context = {
        request: req,
        next: nextFn || defaultNext,
        env: {},
      };
      return await middlewareOnRequest(context);
    };

    it("should allow registration requests originating from the official domain", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: {
          "Origin": "https://qrcraftly.com",
        },
      });

      const res = await runMiddleware(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("next called");
    });

    it("should allow registration requests originating from local origins", async () => {
      const req = new Request("http://localhost:3000/api/redirect/register", {
        method: "POST",
        headers: {
          "Origin": "http://localhost:3000",
        },
      });

      const res = await runMiddleware(req);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("next called");
    });

    it("should reject registration requests originating from unauthorized third-party sites", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: {
          "Origin": "https://evil.com",
        },
      });

      const res = await runMiddleware(req);
      expect(res.status).toBe(403);
      const json = await res.json() as { error: string };
      expect(json.error).toContain("Origin not allowed");
    });

    it("should reject non-local registration requests without Origin/Referer headers", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
      });

      const res = await runMiddleware(req);
      expect(res.status).toBe(403);
      const json = await res.json() as { error: string };
      expect(json.error).toContain("Origin or Referer header required");
    });

    it("should allow local requests without Origin/Referer headers", async () => {
      const req = new Request("http://localhost:3000/api/redirect/register", {
        method: "POST",
      });

      const res = await runMiddleware(req);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("next called");
    });

    it("should enforce client-IP rate limiting (maximum 10 requests per minute)", async () => {
      const ip = "192.168.1.50";
      const makeRequest = () => new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: {
          "Origin": "https://qrcraftly.com",
          "CF-Connecting-IP": ip,
        },
      });

      // Submit 10 successful requests
      for (let i = 0; i < 10; i++) {
        const res = await runMiddleware(makeRequest());
        expect(res.status).toBe(200);
      }

      // The 11th request must be blocked
      const res11 = await runMiddleware(makeRequest());
      expect(res11.status).toBe(429);
      const json = await res11.json() as { error: string };
      expect(json.error).toContain("Rate limit exceeded");

      // A different client IP should still be allowed
      const otherReq = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: {
          "Origin": "https://qrcraftly.com",
          "CF-Connecting-IP": "8.8.8.8",
        },
      });
      const otherRes = await runMiddleware(otherReq);
      expect(otherRes.status).toBe(200);
    });
  });

  describe("URL Safety & Scheme Validation", () => {
    const runRegister = async (url: string) => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({ redirectUrl: url }),
        headers: { "Content-Type": "application/json" }
      });
      return await registerOnRequestPost({ request: req, env: {} });
    };

    const runUpdate = async (url: string) => {
      const req = new Request("https://qrcraftly.com/api/redirect/update", {
        method: "POST",
        body: JSON.stringify({ id: "some-id", adminKey: "some-key", newUrl: url }),
        headers: { "Content-Type": "application/json" }
      });
      return await updateOnRequestPost({ request: req, env: {} });
    };

    it("should register a valid http/https URL successfully", async () => {
      const res = await runRegister("https://google.com/search?q=qrcraftly");
      expect(res.status).toBe(200);
      const json = await res.json() as { id: string; redirectUrl: string };
      expect(json.id).toBeDefined();
      expect(json.redirectUrl).toBe("https://google.com/search?q=qrcraftly");
    });

    it("should reject invalid format URLs", async () => {
      const res = await runRegister("not-a-valid-url");
      expect(res.status).toBe(400);
      const json = await res.json() as { error: string };
      expect(json.error).toContain("Invalid URL format");
    });

    it("should reject URLs with non-http/https schemes", async () => {
      const res = await runRegister("ftp://ftp.example.com/file.txt");
      expect(res.status).toBe(400);
      const json = await res.json() as { error: string };
      expect(json.error).toContain("Scheme must be http: or https:");
    });

    it("should block dangerous schemes explicitly", async () => {
      const dangerous = [
        "javascript:alert(1)",
        "data:text/html,<h1>Hacked</h1>",
        "file:///etc/passwd",
        "vbscript:msgbox",
        "blob:https://evil.com/uuid"
      ];

      for (const url of dangerous) {
        const res = await runRegister(url);
        expect(res.status).toBe(400);
        const json = await res.json() as { error: string };
        expect(json.error).toBeDefined();
      }
    });

    it("should block URLs containing control or invisible characters", async () => {
      const controlUrls = [
        "https://example.com\x00",
        "https://example.com\x1F",
        "https://example.com\u200B", // Zero-width space
        "https://example.com\uFEFF", // Byte order mark
      ];

      for (const url of controlUrls) {
        const res = await runRegister(url);
        expect(res.status).toBe(400);
        const json = await res.json() as { error: string };
        expect(json.error).toContain("URL contains invalid control characters or zero-width spaces");
      }
    });

    it("should enforce URL validation rules on update endpoint too", async () => {
      // Seed an initial entry in Mock DB so update passes existence checks
      (globalThis as any).__mockKV.set("redirect:some-id", JSON.stringify({
        id: "some-id",
        redirectUrl: "https://initial.com",
        adminKey: "some-key",
        scans: 0
      }));

      // A valid url update works
      const successRes = await runUpdate("https://new-destination.com");
      expect(successRes.status).toBe(200);

      // An invalid scheme is rejected
      const failRes = await runUpdate("javascript:alert(1)");
      expect(failRes.status).toBe(400);
      const json = await failRes.json() as { error: string };
      expect(json.error).toBeDefined();
    });
  });

  describe("Browser Redirection & Asynchronous Analytics", () => {
    it("should redirect immediately and increment scan count asynchronously using context.waitUntil", async () => {
      const kv = new MockKV();
      const redirectData = {
        id: "test-id",
        redirectUrl: "https://target-destination.com/event",
        adminKey: "admin-secret",
        scans: 5,
        createdAt: new Date().toISOString()
      };
      await kv.put("redirect:test-id", JSON.stringify(redirectData));

      const req = new Request("https://qrcraftly.com/api/redirect/test-id");
      const promises: Promise<any>[] = [];
      const context = {
        request: req,
        env: { REDIRECTS_KV: kv },
        params: { id: "test-id" },
        waitUntil: (promise: Promise<any>) => {
          promises.push(promise);
        }
      };

      const startTime = Date.now();
      const res = await lookupOnRequestGet(context);
      const latency = Date.now() - startTime;

      // Ensure latency of the redirection call is under 100ms
      expect(latency).toBeLessThan(100);

      // It must return a 307 redirect
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("https://target-destination.com/event");

      // Initially, the database write is running in background (via waitUntil)
      await Promise.all(promises);

      // Now the scans should be incremented
      const updatedStr = await kv.get("redirect:test-id");
      expect(updatedStr).not.toBeNull();
      const updatedData = JSON.parse(updatedStr!);
      expect(updatedData.scans).toBe(6);
    });
  });

  describe("Relational D1 Database & High-Concurrency Tracking", () => {
    it("should complete redirection under 100ms edge latency threshold", async () => {
      const mockD1 = new MockD1Database();
      const id = "perf-test-id";
      await mockD1.prepare("INSERT INTO redirects (id, redirect_url, admin_key, scans, created_at) VALUES (?, ?, ?, 0, ?)")
        .bind(id, "https://example.com/promo", "key-123", new Date().toISOString())
        .run();

      const req = new Request(`https://qrcraftly.com/api/redirect/${id}`);
      const waitUntilPromises: Promise<any>[] = [];
      const context = {
        request: req,
        env: { DB: mockD1 },
        params: { id },
        waitUntil: (p: Promise<any>) => waitUntilPromises.push(p),
      };

      const startTime = performance.now();
      const response = await lookupOnRequestGet(context);
      const executionTime = performance.now() - startTime;

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe("https://example.com/promo");
      expect(executionTime).toBeLessThan(100);

      await Promise.all(waitUntilPromises);
    });

    it("should accurately process 50 concurrent scan requests without dropping scan count increments", async () => {
      const mockD1 = new MockD1Database();
      const id = "surge-test-id";
      await mockD1.prepare("INSERT INTO redirects (id, redirect_url, admin_key, scans, created_at) VALUES (?, ?, ?, 0, ?)")
        .bind(id, "https://event.qrcraftly.com/live", "admin-key-surge", new Date().toISOString())
        .run();

      const concurrentRequests = 50;
      const waitUntilPromises: Promise<any>[] = [];

      // Simulate 50 concurrent requests at 50 RPS
      const requests = Array.from({ length: concurrentRequests }, () => {
        const req = new Request(`https://qrcraftly.com/api/redirect/${id}`);
        const context = {
          request: req,
          env: { DB: mockD1 },
          params: { id },
          waitUntil: (p: Promise<any>) => waitUntilPromises.push(p),
        };
        return lookupOnRequestGet(context);
      });

      const responses = await Promise.all(requests);

      // Verify all responses returned 307
      for (const res of responses) {
        expect(res.status).toBe(307);
        expect(res.headers.get("Location")).toBe("https://event.qrcraftly.com/live");
      }

      // Wait for all non-blocking background write operations to finish
      await Promise.all(waitUntilPromises);

      // Query database stats to verify zero dropped counts
      const statsReq = new Request(`https://qrcraftly.com/api/redirect/stats?id=${id}`);
      const statsRes = await statsOnRequestGet({ request: statsReq, env: { DB: mockD1 } });
      const statsJson = await statsRes.json() as { id: string; scans: number; redirectUrl: string };

      expect(statsJson.scans).toBe(50);
    });

    it("should allow administrators to update destination URLs with valid administrative keys and block unauthorized keys", async () => {
      const mockD1 = new MockD1Database();
      const id = "admin-update-id";
      const adminKey = "valid-secret-key";

      await mockD1.prepare("INSERT INTO redirects (id, redirect_url, admin_key, scans, created_at) VALUES (?, ?, ?, 0, ?)")
        .bind(id, "https://old-link.com", adminKey, new Date().toISOString())
        .run();

      // Unauthorized key update attempt
      const badReq = new Request("https://qrcraftly.com/api/redirect/update", {
        method: "POST",
        body: JSON.stringify({ id, adminKey: "wrong-key", newUrl: "https://hacked.com" }),
        headers: { "Content-Type": "application/json" },
      });
      const badRes = await updateOnRequestPost({ request: badReq, env: { DB: mockD1 } });
      expect(badRes.status).toBe(401);

      // Valid admin key update
      const goodReq = new Request("https://qrcraftly.com/api/redirect/update", {
        method: "POST",
        body: JSON.stringify({ id, adminKey, newUrl: "https://new-destination.com" }),
        headers: { "Content-Type": "application/json" },
      });
      const goodRes = await updateOnRequestPost({ request: goodReq, env: { DB: mockD1 } });
      expect(goodRes.status).toBe(200);

      // Verify redirection target is updated
      const redirectReq = new Request(`https://qrcraftly.com/api/redirect/${id}`);
      const redirectRes = await lookupOnRequestGet({
        request: redirectReq,
        env: { DB: mockD1 },
        params: { id },
      });
      expect(redirectRes.headers.get("Location")).toContain("https://new-destination.com");
    });

    it("should operate fully offline in local development using in-memory mock relational storage", async () => {
      // Un-bound env (no active Cloudflare edge connection)
      const regReq = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({ redirectUrl: "https://offline-dev.local/page" }),
        headers: { "Content-Type": "application/json" },
      });

      const regRes = await registerOnRequestPost({ request: regReq, env: {} });
      expect(regRes.status).toBe(200);
      const regJson = await regRes.json() as { id: string; redirectUrl: string; adminKey: string };

      // Redirection lookup offline
      const getReq = new Request(`https://qrcraftly.com/api/redirect/${regJson.id}`);
      const waitUntilPromises: Promise<any>[] = [];
      const getRes = await lookupOnRequestGet({
        request: getReq,
        env: {},
        params: { id: regJson.id },
        waitUntil: (p) => waitUntilPromises.push(p),
      });
      expect(getRes.status).toBe(307);
      expect(getRes.headers.get("Location")).toBe("https://offline-dev.local/page");

      await Promise.all(waitUntilPromises);

      // Check stats offline
      const statsReq = new Request(`https://qrcraftly.com/api/redirect/stats?id=${regJson.id}`);
      const statsRes = await statsOnRequestGet({ request: statsReq, env: {} });
      const statsJson = await statsRes.json() as { scans: number };
      expect(statsJson.scans).toBe(1);
    });
  });
});

