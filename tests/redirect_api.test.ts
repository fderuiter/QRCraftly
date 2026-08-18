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
  });
});
