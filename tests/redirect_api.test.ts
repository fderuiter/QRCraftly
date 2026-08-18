import { describe, it, expect, beforeEach } from "vitest";
import { onRequest as middlewareOnRequest } from "../functions/api/redirect/_middleware";
import { onRequestPost as registerOnRequestPost } from "../functions/api/redirect/register";
import { onRequestPost as updateOnRequestPost } from "../functions/api/redirect/update";
import { onRequestGet as lookupOnRequestGet } from "../functions/api/redirect/[id]";

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
    // Reset the global mock KV
    (globalThis as any).__mockKV = new Map<string, string>();
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
      // Seed an initial entry in Mock KV so update passes existence checks
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

    it("should register platform-specific store URLs when provided", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://example.com",
          iosUrl: "https://apps.apple.com/app/id123456789",
          androidUrl: "https://play.google.com/store/apps/details?id=com.example.app"
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
          iosUrl: "javascript:alert('ios')"
        }),
        headers: { "Content-Type": "application/json" }
      });
      const res = await registerOnRequestPost({ request: req, env: {} });
      expect(res.status).toBe(400);
      const json = await res.json() as { error: string };
      expect(json.error).toContain("iOS URL");
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

      // Ensure latency of the redirection call is extremely low
      expect(latency).toBeLessThan(150);

      // It must return a 307 redirect
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("https://target-destination.com/event");

      // Initially, the database write is running in background (via waitUntil)
      // So let's wait for all tracked waitUntil promises to resolve
      await Promise.all(promises);

      // Now the scans should be incremented
      const updatedStr = await kv.get("redirect:test-id");
      expect(updatedStr).not.toBeNull();
      const updatedData = JSON.parse(updatedStr!);
      expect(updatedData.scans).toBe(6);
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
});
