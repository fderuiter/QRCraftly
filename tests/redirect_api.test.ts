import { describe, it, expect, beforeEach } from "vitest";
import { onRequest as middlewareOnRequest } from "../functions/api/redirect/_middleware";
import { onRequestPost as registerOnRequestPost } from "../functions/api/redirect/register";
import { onRequestPost as updateOnRequestPost } from "../functions/api/redirect/update";
import { onRequestGet as lookupOnRequestGet } from "../functions/api/redirect/[id]";
import { onRequestGet as statsOnRequestGet } from "../functions/api/redirect/stats";
import { MockD1Database } from "../functions/api/redirect/_db";

class MockKV {
  store = new Map<string, string>();
  metadataStore = new Map<string, any>();
  optionsStore = new Map<string, any>();

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async put(key: string, value: string, options?: { metadata?: any; expirationTtl?: number }) {
    this.store.set(key, value);
    if (options?.metadata) {
      this.metadataStore.set(key, options.metadata);
    }
    if (options) {
      this.optionsStore.set(key, options);
    }
  }

  async list(options?: { prefix?: string; cursor?: string }) {
    const prefix = options?.prefix || "";
    const keys: Array<{ name: string; metadata?: any }> = [];
    for (const [key] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        keys.push({
          name: key,
          metadata: this.metadataStore.get(key),
        });
      }
    }
    return {
      keys,
      list_complete: true,
    };
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

    it("should use time-bucketed KV keys with expirationTtl when REDIRECTS_KV is provided", async () => {
      const kv = new MockKV();
      const ip = "203.0.113.42";
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: {
          "Origin": "https://qrcraftly.com",
          "CF-Connecting-IP": ip,
        },
      });

      const res = await middlewareOnRequest({
        request: req,
        next: async () => new Response("next called", { status: 200 }),
        env: { REDIRECTS_KV: kv },
      });

      expect(res.status).toBe(200);

      const currentMinuteBucket = Math.floor(Date.now() / 60000);
      const expectedBucketKey = `ratelimit:${ip}:${currentMinuteBucket}`;

      const storedCount = await kv.get(expectedBucketKey);
      expect(storedCount).toBe("1");

      const options = kv.optionsStore.get(expectedBucketKey);
      expect(options).toBeDefined();
      expect(options.expirationTtl).toBe(120);
    });

    it("should reset request limits when time bucket advances to next minute window", async () => {
      const kv = new MockKV();
      const ip = "198.51.100.22";
      const makeRequest = () => new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: {
          "Origin": "https://qrcraftly.com",
          "CF-Connecting-IP": ip,
        },
      });

      const currentMinuteBucket = Math.floor(Date.now() / 60000);
      const pastBucketKey = `ratelimit:${ip}:${currentMinuteBucket - 1}`;
      
      // Simulate that the client exhausted 10 requests in the previous minute bucket
      await kv.put(pastBucketKey, "10");

      // Request in current minute bucket should pass because it's a new time bucket
      const res = await middlewareOnRequest({
        request: makeRequest(),
        next: async () => new Response("next called", { status: 200 }),
        env: { REDIRECTS_KV: kv },
      });

      expect(res.status).toBe(200);

      // Current bucket should now have count 1
      const currentBucketKey = `ratelimit:${ip}:${currentMinuteBucket}`;
      expect(await kv.get(currentBucketKey)).toBe("1");
    });

    it("should fail open when shared KV storage experiences a service error", async () => {
      const faultyKV = {
        get: async () => { throw new Error("KV database connection timeout"); },
        put: async () => { throw new Error("KV database connection timeout"); },
      };

      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: {
          "Origin": "https://qrcraftly.com",
          "CF-Connecting-IP": "1.2.3.4",
        },
      });

      const res = await middlewareOnRequest({
        request: req,
        next: async () => new Response("next called", { status: 200 }),
        env: { REDIRECTS_KV: faultyKV },
      });

      // Must fail open and allow the request to proceed instead of returning 500 or crashing
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("next called");
    });

    it("should exclude non-registration endpoints from rate limiting", async () => {
      const ip = "10.0.0.1";
      const kv = new MockKV();
      const currentMinuteBucket = Math.floor(Date.now() / 60000);
      const bucketKey = `ratelimit:${ip}:${currentMinuteBucket}`;

      // Max out the rate limit counter for this IP
      await kv.put(bucketKey, "10");

      // Request to GET /api/redirect/some-id
      const reqGet = new Request("https://qrcraftly.com/api/redirect/some-id", {
        method: "GET",
        headers: { "CF-Connecting-IP": ip },
      });

      const resGet = await middlewareOnRequest({
        request: reqGet,
        next: async () => new Response("next called", { status: 200 }),
        env: { REDIRECTS_KV: kv },
      });

      expect(resGet.status).toBe(200);

      // Request to POST /api/redirect/update
      const reqUpdate = new Request("https://qrcraftly.com/api/redirect/update", {
        method: "POST",
        headers: { "CF-Connecting-IP": ip },
      });

      const resUpdate = await middlewareOnRequest({
        request: reqUpdate,
        next: async () => new Response("next called", { status: 200 }),
        env: { REDIRECTS_KV: kv },
      });

      expect(resUpdate.status).toBe(200);
    });
  });

  describe("Response Header Standardization Policy", () => {
    it("should inject X-Robots-Tag: noindex, follow on all responses passing through middleware", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: { "Origin": "https://qrcraftly.com" },
      });

      const res = await middlewareOnRequest({
        request: req,
        next: async () => new Response("OK", { status: 200 }),
        env: {},
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    });

    it("should inject Cache-Control: no-store, no-cache, must-revalidate on all responses passing through middleware", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: { "Origin": "https://qrcraftly.com" },
      });

      const res = await middlewareOnRequest({
        request: req,
        next: async () => new Response("OK", { status: 200 }),
        env: {},
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
    });

    it("should inject standardized headers on 403 Forbidden responses generated directly by middleware", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: { "Origin": "https://unauthorized-domain.com" },
      });

      const res = await middlewareOnRequest({
        request: req,
        next: async () => new Response("OK", { status: 200 }),
        env: {},
      });

      expect(res.status).toBe(403);
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, follow");
      expect(res.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
    });

    it("should inject standardized headers on 429 Too Many Requests responses generated directly by middleware", async () => {
      const kv = new MockKV();
      const clientIP = "10.0.0.99";
      const currentMinuteBucket = Math.floor(Date.now() / 60000);
      await kv.put(`ratelimit:${clientIP}:${currentMinuteBucket}`, "10");

      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        headers: {
          "Origin": "https://qrcraftly.com",
          "CF-Connecting-IP": clientIP,
        },
      });

      const res = await middlewareOnRequest({
        request: req,
        next: async () => new Response("OK", { status: 200 }),
        env: { REDIRECTS_KV: kv },
      });

      expect(res.status).toBe(429);
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, follow");
      expect(res.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
    });

    it("should inject standardized headers into 307 dynamic redirection responses while preserving Location header", async () => {
      const kv = new MockKV();
      const redirectData = {
        id: "hdr-test-id",
        redirectUrl: "https://destination.example.com",
        adminKey: "key-123",
        createdAt: new Date().toISOString(),
      };
      await kv.put("redirect:hdr-test-id", JSON.stringify(redirectData));

      const req = new Request("https://qrcraftly.com/api/redirect/hdr-test-id", {
        method: "GET",
      });

      const context = {
        request: req,
        env: { REDIRECTS_KV: kv },
        params: { id: "hdr-test-id" },
      };

      const res = await middlewareOnRequest({
        request: req,
        next: () => lookupOnRequestGet(context),
        env: { REDIRECTS_KV: kv },
      });

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("https://destination.example.com");
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, follow");
      expect(res.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
    });
  });

  describe("URL Safety & Scheme Validation", () => {
    const runRegister = async (url: string) => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({ redirectUrl: url, turnstileToken: "valid-turnstile-token" }),
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

    it("should block dangerous schemes explicitly with descriptive error messages", async () => {
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
        expect(json.error).toContain("Blocked dangerous URL scheme");
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

    it("should enforce URL validation rules on update endpoint and leave original destination unchanged on rejection", async () => {
      // Seed an initial entry in Mock KV so update passes existence checks
      const originalRecord = {
        id: "some-id",
        redirectUrl: "https://initial-destination.com/original",
        adminKey: "some-key",
        scans: 0
      };
      (globalThis as any).__mockKV.set("redirect:some-id", JSON.stringify(originalRecord));

      // A valid url update works
      const successRes = await runUpdate("https://new-destination.com");
      expect(successRes.status).toBe(200);
      const successData = JSON.parse((globalThis as any).__mockKV.get("redirect:some-id"));
      expect(successData.redirectUrl).toBe("https://new-destination.com");

      // An invalid scheme is rejected with 400 and leaves the destination unchanged
      const failRes = await runUpdate("javascript:alert(1)");
      expect(failRes.status).toBe(400);
      const json = await failRes.json() as { error: string };
      expect(json.error).toContain("Blocked dangerous URL scheme");

      // Original destination remains unchanged after rejection
      const unchangedData = JSON.parse((globalThis as any).__mockKV.get("redirect:some-id"));
      expect(unchangedData.redirectUrl).toBe("https://new-destination.com");

      // Non-http scheme is rejected with 400 and leaves the destination unchanged
      const failRes2 = await runUpdate("ftp://ftp.example.com/file");
      expect(failRes2.status).toBe(400);
      const json2 = await failRes2.json() as { error: string };
      expect(json2.error).toContain("Scheme must be http: or https:");

      const unchangedData2 = JSON.parse((globalThis as any).__mockKV.get("redirect:some-id"));
      expect(unchangedData2.redirectUrl).toBe("https://new-destination.com");
    });

    it("should register platform-specific store URLs when provided", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://example.com",
          iosUrl: "https://apps.apple.com/app/id123456789",
          androidUrl: "https://play.google.com/store/apps/details?id=com.example.app",
          turnstileToken: "valid-turnstile-token"
        }),
        headers: { "Content-Type": "application/json" }
      });
      const res = await registerOnRequestPost({ request: req, env: {} });
      expect(res.status).toBe(200);
      const json = await res.json() as { id: string; redirectUrl: string; iosUrl?: string; androidUrl?: string };
      expect(json.redirectUrl).toBe("https://example.com");
      expect(json.iosUrl).toBe("https://apps.apple.com/app/id123456789");
      expect(json.androidUrl).toBe("https://play.google.com/store/apps/details?id=com.example.app");
    });

    it("should reject invalid platform-specific store URLs", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://example.com",
          iosUrl: "javascript:alert('ios')",
          turnstileToken: "valid-turnstile-token"
        }),
        headers: { "Content-Type": "application/json" }
      });
      const res = await registerOnRequestPost({ request: req, env: {} });
      expect(res.status).toBe(400);
      const json = await res.json() as { error: string };
      expect(json.error).toContain("iOS URL");
    });
  });

  describe("Browser Redirection & Zero-Transit Counter-Only Enforcement", () => {
    it("should redirect immediately and increment scan count without writing per-event KV records", async () => {
      const kv = new MockKV();
      const redirectData = {
        id: "test-id",
        redirectUrl: "https://target-destination.com/event",
        adminKey: "admin-secret",
        scans: 0,
        createdAt: new Date().toISOString()
      };
      await kv.put("redirect:test-id", JSON.stringify(redirectData));

      const req = new Request("https://qrcraftly.com/api/redirect/test-id", {
        headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)" }
      });
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

      // Wait for background waitUntil promises
      await Promise.all(promises);

      // Zero per-event KV records must be written
      const listRes = await kv.list({ prefix: "event:test-id:" });
      expect(listRes.keys.length).toBe(0);
    });

    it("should return aggregate scan totals without device or location breakdowns on stats endpoint", async () => {
      const kv = new MockKV();
      const redirectData = {
        id: "test-id-2",
        redirectUrl: "https://example.com/dest",
        adminKey: "admin-secret-2",
        scans: 0,
        createdAt: new Date().toISOString()
      };
      await kv.put("redirect:test-id-2", JSON.stringify(redirectData));

      // Simulate 3 scans on different devices
      const scanDevices = ["Mozilla/5.0 (iPhone)", "Mozilla/5.0 (Windows NT 10.0)", "Mozilla/5.0 (iPad)"];
      for (const ua of scanDevices) {
        const req = new Request("https://qrcraftly.com/api/redirect/test-id-2", {
          headers: { "user-agent": ua }
        });
        const promises: Promise<any>[] = [];
        await lookupOnRequestGet({
          request: req,
          env: { REDIRECTS_KV: kv },
          params: { id: "test-id-2" },
          waitUntil: (p) => { promises.push(p); }
        });
        await Promise.all(promises);
      }

      // Query stats
      const statsReq = new Request("https://qrcraftly.com/api/redirect/stats?id=test-id-2");
      const statsRes = await statsOnRequestGet({ request: statsReq, env: { REDIRECTS_KV: kv } });
      expect(statsRes.status).toBe(200);

      const json = await statsRes.json() as any;
      expect(json.id).toBe("test-id-2");
      expect(json.scans).toBe(3);
      expect(json.devices).toBeUndefined();
      expect(json.locations).toBeUndefined();
      expect(json.hourly).toBeUndefined();
      expect(json.daily).toBeUndefined();
      expect(json.events).toBeUndefined();

      // Ensure zero event keys in KV
      const listRes = await kv.list({ prefix: "event:test-id-2:" });
      expect(listRes.keys.length).toBe(0);
    });

    it("should fall back to local in-memory mock database simulation when REDIRECTS_KV is unavailable", async () => {
      (globalThis as any).__mockKV = new Map<string, string>();
      const redirectData = {
        id: "local-id",
        redirectUrl: "https://local-target.com",
        adminKey: "local-key",
        scans: 0,
        createdAt: new Date().toISOString()
      };
      (globalThis as any).__mockKV.set("redirect:local-id", JSON.stringify(redirectData));

      // Execute scan in dev mode
      const req = new Request("http://localhost:3000/api/redirect/local-id", {
        headers: { "user-agent": "Mozilla/5.0 (Android; Mobile)" }
      });
      const promises: Promise<any>[] = [];
      const redirectRes = await lookupOnRequestGet({
        request: req,
        env: {},
        params: { id: "local-id" },
        waitUntil: (p) => { promises.push(p); }
      });
      await Promise.all(promises);

      expect(redirectRes.status).toBe(307);

      // Verify NO event prefix key created in mock database
      const mockKeys = Array.from((globalThis as any).__mockKV.keys() as Iterable<string>);
      const eventKeys = mockKeys.filter(k => k.startsWith("event:local-id:"));
      expect(eventKeys.length).toBe(0);

      // Verify stats returns simple aggregate scans count
      const statsReq = new Request("http://localhost:3000/api/redirect/stats?id=local-id");
      const statsRes = await statsOnRequestGet({ request: statsReq, env: {} });
      expect(statsRes.status).toBe(200);

      const json = await statsRes.json() as any;
      expect(json.scans).toBe(1);
      expect(json.devices).toBeUndefined();
    });

    it("should preserve total aggregate scan count when editing target redirect URL", async () => {
      const kv = new MockKV();
      const redirectData = {
        id: "edit-id",
        redirectUrl: "https://old-target.com",
        adminKey: "edit-key",
        scans: 0,
        createdAt: new Date().toISOString()
      };
      await kv.put("redirect:edit-id", JSON.stringify(redirectData));

      // Log a scan event
      const req = new Request("https://qrcraftly.com/api/redirect/edit-id");
      const promises: Promise<any>[] = [];
      await lookupOnRequestGet({
        request: req,
        env: { REDIRECTS_KV: kv },
        params: { id: "edit-id" },
        waitUntil: (p) => { promises.push(p); }
      });
      await Promise.all(promises);

      // Update destination URL
      const updateReq = new Request("https://qrcraftly.com/api/redirect/update", {
        method: "POST",
        body: JSON.stringify({ id: "edit-id", adminKey: "edit-key", newUrl: "https://new-target.com" }),
        headers: { "Content-Type": "application/json" }
      });
      const updateRes = await updateOnRequestPost({ request: updateReq, env: { REDIRECTS_KV: kv } });
      expect(updateRes.status).toBe(200);

      // Verify parent record updated
      const updatedParentStr = await kv.get("redirect:edit-id");
      expect(JSON.parse(updatedParentStr!).redirectUrl).toBe("https://new-target.com");

      // Verify zero event keys exist
      const listRes = await kv.list({ prefix: "event:edit-id:" });
      expect(listRes.keys.length).toBe(0);
    });

    it("should route iOS device to Apple App Store URL with 307 status", async () => {
      const kv = new MockKV();
      const record = {
        id: "app-id",
        redirectUrl: "https://example.com/fallback",
        iosUrl: "https://apps.apple.com/app/id123456",
        androidUrl: "https://play.google.com/store/apps/details?id=com.app",
        adminKey: "key",
        scans: 0
      };
      await kv.put("redirect:app-id", JSON.stringify(record));

      const req = new Request("https://qrcraftly.com/api/redirect/app-id", {
        headers: {
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
        }
      });
      const context = { request: req, env: { REDIRECTS_KV: kv }, params: { id: "app-id" } };
      const res = await lookupOnRequestGet(context);

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("https://apps.apple.com/app/id123456");
    });

    it("should route Android device to Google Play Store URL with 307 status", async () => {
      const kv = new MockKV();
      const record = {
        id: "app-id",
        redirectUrl: "https://example.com/fallback",
        iosUrl: "https://apps.apple.com/app/id123456",
        androidUrl: "https://play.google.com/store/apps/details?id=com.app",
        adminKey: "key",
        scans: 0
      };
      await kv.put("redirect:app-id", JSON.stringify(record));

      const req = new Request("https://qrcraftly.com/api/redirect/app-id", {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36"
        }
      });
      const context = { request: req, env: { REDIRECTS_KV: kv }, params: { id: "app-id" } };
      const res = await lookupOnRequestGet(context);

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("https://play.google.com/store/apps/details?id=com.app");
    });

    it("should route Desktop device to default fallback URL with 307 status", async () => {
      const kv = new MockKV();
      const record = {
        id: "app-id",
        redirectUrl: "https://example.com/fallback",
        iosUrl: "https://apps.apple.com/app/id123456",
        androidUrl: "https://play.google.com/store/apps/details?id=com.app",
        adminKey: "key",
        scans: 0
      };
      await kv.put("redirect:app-id", JSON.stringify(record));

      const req = new Request("https://qrcraftly.com/api/redirect/app-id", {
        headers: {
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
      });
      const context = { request: req, env: { REDIRECTS_KV: kv }, params: { id: "app-id" } };
      const res = await lookupOnRequestGet(context);

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("https://example.com/fallback");
    });

    it("should fall back to default destination if platform URL is empty or whitespace", async () => {
      const kv = new MockKV();
      const record = {
        id: "empty-platform-id",
        redirectUrl: "https://example.com/fallback",
        iosUrl: "   ",
        androidUrl: "",
        adminKey: "key",
        scans: 0
      };
      await kv.put("redirect:empty-platform-id", JSON.stringify(record));

      const reqIos = new Request("https://qrcraftly.com/api/redirect/empty-platform-id", {
        headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)" }
      });
      const resIos = await lookupOnRequestGet({ request: reqIos, env: { REDIRECTS_KV: kv }, params: { id: "empty-platform-id" } });
      expect(resIos.status).toBe(307);
      expect(resIos.headers.get("Location")).toBe("https://example.com/fallback");

      const reqAndroid = new Request("https://qrcraftly.com/api/redirect/empty-platform-id", {
        headers: { "user-agent": "Mozilla/5.0 (Linux; Android 12)" }
      });
      const resAndroid = await lookupOnRequestGet({ request: reqAndroid, env: { REDIRECTS_KV: kv }, params: { id: "empty-platform-id" } });
      expect(resAndroid.status).toBe(307);
      expect(resAndroid.headers.get("Location")).toBe("https://example.com/fallback");
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
        body: JSON.stringify({ redirectUrl: "https://offline-dev.local/page", turnstileToken: "valid-turnstile-token" }),
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

  describe("Read-Through KV Edge Cache with D1 Error Fallback Requirements", () => {
    it("should serve target URL from KV edge storage on cache hit without triggering synchronous SQL read", async () => {
      const kv = new MockKV();
      const record = {
        id: "kv-hit-id",
        redirectUrl: "https://cached-destination.com/fast",
        adminKey: "key-hit",
        scans: 10,
        createdAt: new Date().toISOString()
      };
      await kv.put("redirect:kv-hit-id", JSON.stringify(record));

      let d1SelectCalled = false;
      const throwingD1 = {
        prepare: (query: string) => {
          if (query.toUpperCase().includes("SELECT")) {
            d1SelectCalled = true;
            throw new Error("D1 should not be called synchronously on KV cache hit!");
          }
          return {
            bind: () => ({
              run: async () => ({ success: true })
            })
          };
        }
      };

      const req = new Request("https://qrcraftly.com/api/redirect/kv-hit-id");
      const context = {
        request: req,
        env: { REDIRECTS_KV: kv, DB: throwingD1 as any },
        params: { id: "kv-hit-id" }
      };

      const res = await lookupOnRequestGet(context);
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("https://cached-destination.com/fast");
      expect(d1SelectCalled).toBe(false);
    });

    it("should populate KV edge store with complete redirect metadata on cache miss", async () => {
      const kv = new MockKV();
      const mockD1 = new MockD1Database();
      const id = "kv-miss-id";

      await mockD1.prepare("INSERT INTO redirects (id, redirect_url, admin_key, scans, created_at, ios_url, android_url) VALUES (?, ?, ?, 0, ?, ?, ?)")
        .bind(id, "https://d1-original-target.com", "admin-key-miss", 0, new Date().toISOString(), "https://apps.apple.com/app/id999", "https://play.google.com/store/apps/details?id=com.miss")
        .run();

      // KV initially does NOT have this key
      expect(await kv.get("redirect:kv-miss-id")).toBeNull();

      const req = new Request(`https://qrcraftly.com/api/redirect/${id}`);
      const promises: Promise<any>[] = [];
      const res = await lookupOnRequestGet({
        request: req,
        env: { REDIRECTS_KV: kv, DB: mockD1 },
        params: { id },
        waitUntil: (p) => promises.push(p)
      });
      await Promise.all(promises);

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("https://d1-original-target.com");

      // Verify KV edge store was populated with complete metadata
      const cachedStr = await kv.get("redirect:kv-miss-id");
      expect(cachedStr).not.toBeNull();
      const cached = JSON.parse(cachedStr!);
      expect(cached.id).toBe(id);
      expect(cached.redirectUrl).toBe("https://d1-original-target.com");
      expect(cached.iosUrl).toBe("https://apps.apple.com/app/id999");
      expect(cached.androidUrl).toBe("https://play.google.com/store/apps/details?id=com.miss");
    });

    it("should automatically fall back to reading from KV edge storage when primary D1 database query errors", async () => {
      const kv = new MockKV();
      const record = {
        id: "d1-fail-id",
        redirectUrl: "https://fallback-safe-target.com",
        adminKey: "key-fallback",
        scans: 5,
        createdAt: new Date().toISOString()
      };
      await kv.put("redirect:d1-fail-id", JSON.stringify(record));

      const faultyD1 = {
        prepare: () => {
          throw new Error("D1 Database connection timeout / outage");
        }
      };

      const req = new Request("https://qrcraftly.com/api/redirect/d1-fail-id");
      const promises: Promise<any>[] = [];
      const res = await lookupOnRequestGet({
        request: req,
        env: { REDIRECTS_KV: kv, DB: faultyD1 as any },
        params: { id: "d1-fail-id" },
        waitUntil: (p) => promises.push(p)
      });
      await Promise.all(promises);

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toContain("https://fallback-safe-target.com");
    });

    it("should dynamically evaluate iOS, Android, and default user agents against cached KV metadata", async () => {
      const kv = new MockKV();
      const record = {
        id: "multi-device-id",
        redirectUrl: "https://example.com/desktop",
        iosUrl: "https://apps.apple.com/app/id111",
        androidUrl: "https://play.google.com/store/apps/details?id=com.multi",
        adminKey: "multi-key",
        scans: 0
      };
      await kv.put("redirect:multi-device-id", JSON.stringify(record));

      // iOS test
      const iosReq = new Request("https://qrcraftly.com/api/redirect/multi-device-id", {
        headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }
      });
      const iosRes = await lookupOnRequestGet({ request: iosReq, env: { REDIRECTS_KV: kv }, params: { id: "multi-device-id" } });
      expect(iosRes.status).toBe(307);
      expect(iosRes.headers.get("Location")).toBe("https://apps.apple.com/app/id111");

      // Android test
      const androidReq = new Request("https://qrcraftly.com/api/redirect/multi-device-id", {
        headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14; Mobile)" }
      });
      const androidRes = await lookupOnRequestGet({ request: androidReq, env: { REDIRECTS_KV: kv }, params: { id: "multi-device-id" } });
      expect(androidRes.status).toBe(307);
      expect(androidRes.headers.get("Location")).toBe("https://play.google.com/store/apps/details?id=com.multi");

      // Desktop test
      const desktopReq = new Request("https://qrcraftly.com/api/redirect/multi-device-id", {
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      const desktopRes = await lookupOnRequestGet({ request: desktopReq, env: { REDIRECTS_KV: kv }, params: { id: "multi-device-id" } });
      expect(desktopRes.status).toBe(307);
      expect(desktopRes.headers.get("Location")).toBe("https://example.com/desktop");
    });

    it("should return expected 200 JSON payload from cached metadata when requested via query parameter or Accept header", async () => {
      const kv = new MockKV();
      const record = {
        id: "json-cached-id",
        redirectUrl: "https://example.com/main",
        iosUrl: "https://apps.apple.com/app/id222",
        androidUrl: "https://play.google.com/store/apps/details?id=com.json",
        adminKey: "json-key",
        scans: 2
      };
      await kv.put("redirect:json-cached-id", JSON.stringify(record));

      // Query param json=1
      const paramReq = new Request("https://qrcraftly.com/api/redirect/json-cached-id?json=1");
      const paramRes = await lookupOnRequestGet({ request: paramReq, env: { REDIRECTS_KV: kv }, params: { id: "json-cached-id" } });
      expect(paramRes.status).toBe(200);
      expect(paramRes.headers.get("Content-Type")).toContain("application/json");
      const paramJson = await paramRes.json() as any;
      expect(paramJson.id).toBe("json-cached-id");
      expect(paramJson.redirectUrl).toBe("https://example.com/main");
      expect(paramJson.iosUrl).toBe("https://apps.apple.com/app/id222");
      expect(paramJson.androidUrl).toBe("https://play.google.com/store/apps/details?id=com.json");

      // Accept header application/json
      const headerReq = new Request("https://qrcraftly.com/api/redirect/json-cached-id", {
        headers: { Accept: "application/json" }
      });
      const headerRes = await lookupOnRequestGet({ request: headerReq, env: { REDIRECTS_KV: kv }, params: { id: "json-cached-id" } });
      expect(headerRes.status).toBe(200);
      const headerJson = await headerRes.json() as any;
      expect(headerJson.id).toBe("json-cached-id");
      expect(headerJson.redirectUrl).toBe("https://example.com/main");
    });

    it("should execute scan counting as non-blocking tasks that fail open on D1 error", async () => {
      const kv = new MockKV();
      const record = {
        id: "fail-open-telemetry-id",
        redirectUrl: "https://target.com/fail-open",
        adminKey: "fo-key",
        scans: 0
      };
      await kv.put("redirect:fail-open-telemetry-id", JSON.stringify(record));

      const faultyD1 = {
        prepare: () => {
          return {
            bind: () => ({
              run: async () => {
                throw new Error("D1 UPDATE error during background scan increment");
              }
            })
          };
        }
      };

      const req = new Request("https://qrcraftly.com/api/redirect/fail-open-telemetry-id");
      const promises: Promise<any>[] = [];
      const res = await lookupOnRequestGet({
        request: req,
        env: { REDIRECTS_KV: kv, DB: faultyD1 as any },
        params: { id: "fail-open-telemetry-id" },
        waitUntil: (p) => promises.push(p)
      });

      // User redirection must succeed immediately without throwing or failing
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("https://target.com/fail-open");

      // Non-blocking background task runs and catches D1 error without unhandled rejection
      await expect(Promise.all(promises)).resolves.toBeDefined();

      // Zero event keys written to KV
      const events = await kv.list({ prefix: "event:fail-open-telemetry-id:" });
      expect(events.keys.length).toBe(0);
    });
  });
});

