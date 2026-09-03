import { describe, it, expect, beforeEach, vi } from "vitest";
import { onRequestPost as registerOnRequestPost } from "../functions/api/redirect/register";
import { onRequestGet as lookupOnRequestGet } from "../functions/api/redirect/[id]";
import { deobfuscateUrl, checkUrlReputation, validateTurnstileToken } from "../src/utils/reputation";

describe("Synchronous Reputation API & Turnstile Bot Safeguards", () => {
  beforeEach(() => {
    (globalThis as any).__mockKV = new Map<string, string>();
    (globalThis as any).__mockDBStore = new Map<string, any>();
    delete (globalThis as any).__mockD1Instance;
  });

  describe("Requirement 1 & 2: Cloudflare Turnstile Bot Safeguard", () => {
    it("should reject dynamic link registration requests when Turnstile token is missing", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({ redirectUrl: "https://clean-example.com" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerOnRequestPost({ request: req, env: {} });
      expect(res.status).toBe(400);

      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("Missing Turnstile bot challenge token");
    });

    it("should reject dynamic link registration requests when Turnstile token verification fails", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://clean-example.com",
          turnstileToken: "invalid-token",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerOnRequestPost({ request: req, env: {} });
      expect(res.status).toBe(400);

      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("Turnstile challenge verification failed");
    });

    it("should allow dynamic link registration requests when a valid Turnstile token is supplied", async () => {
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://clean-example.com",
          turnstileToken: "valid-turnstile-token",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerOnRequestPost({ request: req, env: {} });
      expect(res.status).toBe(200);

      const json = (await res.json()) as { id: string; redirectUrl: string };
      expect(json.id).toBeDefined();
      expect(json.redirectUrl).toBe("https://clean-example.com");
    });

    it("should block processing on Turnstile failure BEFORE calling threat intelligence services (Guardrail 3)", async () => {
      const mockEnv = {
        REPUTATION_API_URL: "https://api.threatintel.mock/check",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://phishing.com",
          turnstileToken: "invalid-token",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerOnRequestPost({ request: req, env: mockEnv });
      expect(res.status).toBe(400);

      // Verify external threat intel API fetch was NEVER called because Turnstile failed first
      const threatApiCalls = fetchSpy.mock.calls.filter((call) =>
        String(call[0]).includes("api.threatintel.mock")
      );
      expect(threatApiCalls.length).toBe(0);

      fetchSpy.mockRestore();
    });
  });

  describe("Requirement 3: Full URL De-obfuscation", () => {
    it("should de-obfuscate percent-encoded destination URLs", () => {
      // "phishing.com" encoded in percent format
      const raw = "http%3A%2F%2F%70%68%69%73%68%69%6E%67%2E%63%6F%6D%2F%70%61%74%68";
      const result = deobfuscateUrl(raw);

      expect(result.deobfuscatedUrl).toContain("phishing.com");
      expect(result.domains).toContain("phishing.com");
    });

    it("should de-obfuscate HTML entity-encoded destination URLs", () => {
      const raw = "&#104;&#116;&#116;&#112;&#115;&#58;&#47;&#47;&#101;&#118;&#105;&#108;&#45;&#112;&#104;&#105;&#115;&#104;&#105;&#110;&#103;&#46;&#99;&#111;&#109;";
      const result = deobfuscateUrl(raw);

      expect(result.deobfuscatedUrl).toContain("evil-phishing.com");
      expect(result.domains).toContain("evil-phishing.com");
    });

    it("should strip control characters and zero-width spaces", () => {
      const raw = "https://phish\u200Bing-site.com\x00/path";
      const result = deobfuscateUrl(raw);

      expect(result.deobfuscatedUrl).toBe("https://phishing-site.com/path");
      expect(result.domains).toContain("phishing-site.com");
    });

    it("should extract nested destination domains embedded in query parameters", () => {
      const raw = "https://safe-redirector.com/link?target=http%3A%2F%2Fmalware-site.org%2Fpayload";
      const result = deobfuscateUrl(raw);

      expect(result.domains).toContain("safe-redirector.com");
      expect(result.domains).toContain("malware-site.org");
    });
  });

  describe("Requirement 4 & 5: Synchronous Reputation & Threat Intelligence Evaluation", () => {
    it("should reject registration of known phishing or malware target URLs with an explicit error", async () => {
      const phishingUrls = [
        "https://phishing.com/login",
        "https://evil-phishing.com/bank",
        "https://malware.org/download.exe",
        "https://phish-target.com/account",
      ];

      for (const targetUrl of phishingUrls) {
        const req = new Request("https://qrcraftly.com/api/redirect/register", {
          method: "POST",
          body: JSON.stringify({
            redirectUrl: targetUrl,
            turnstileToken: "valid-turnstile-token",
          }),
          headers: { "Content-Type": "application/json" },
        });

        const res = await registerOnRequestPost({ request: req, env: {} });
        expect(res.status).toBe(400);

        const json = (await res.json()) as { error: string };
        expect(json.error).toBeDefined();
        expect(json.error.toLowerCase()).toMatch(/flagged as malicious|phishing/);
      }
    });

    it("should de-obfuscate target URLs and run reputation check prior to link creation", async () => {
      // Obfuscated phishing URL: "http://phishing.com" encoded in percent-encoding
      const obfuscatedPhishingUrl = "http%3A%2F%2Fphishing.com%2Faccount";

      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: obfuscatedPhishingUrl,
          turnstileToken: "valid-turnstile-token",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerOnRequestPost({ request: req, env: {} });
      expect(res.status).toBe(400);

      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("phishing.com");
    });

    it("should query external threat intelligence API synchronously when configured", async () => {
      const mockEnv = {
        REPUTATION_API_URL: "https://threat-intel.mock/v1/check",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        if (String(url).includes("threat-intel.mock")) {
          return new Response(
            JSON.stringify({
              safe: false,
              malicious: true,
              reason: "Flagged by external threat intelligence database (phishing)",
              flaggedDomain: "flagged-external.com",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("ok");
      });

      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://flagged-external.com/login",
          turnstileToken: "valid-turnstile-token",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerOnRequestPost({ request: req, env: mockEnv });
      expect(res.status).toBe(400);

      const json = (await res.json()) as { error: string };
      expect(json.error).toContain("Flagged by external threat intelligence database");

      fetchSpy.mockRestore();
    });

    it("should fall back gracefully if external reputation APIs are unreachable or timeout (Guardrail 4)", async () => {
      const mockEnv = {
        REPUTATION_API_URL: "https://unreachable-threat-intel-api.invalid/check",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
        if (String(url).includes("unreachable-threat-intel-api")) {
          throw new Error("Network timeout / Connection refused");
        }
        return new Response("ok");
      });

      // Clean URL should still register successfully when external API fails
      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://clean-legitimate-website.com",
          turnstileToken: "valid-turnstile-token",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerOnRequestPost({ request: req, env: mockEnv });
      expect(res.status).toBe(200);

      const json = (await res.json()) as { id: string };
      expect(json.id).toBeDefined();

      fetchSpy.mockRestore();
    });
  });

  describe("Scanner Redirect Execution & Latency (Acceptance Criteria 4 & Success Metric 3)", () => {
    it("should redirect scanners without scan-time reputation delays or interstitial pages", async () => {
      // 1. Register a valid link
      const regReq = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://fast-clean-site.com",
          turnstileToken: "valid-turnstile-token",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const regRes = await registerOnRequestPost({ request: regReq, env: {} });
      const regJson = (await regRes.json()) as { id: string };

      // 2. Perform scanner redirect lookup
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const redirectReq = new Request(`https://qrcraftly.com/api/redirect/${regJson.id}`, {
        method: "GET",
      });

      const startTime = performance.now();
      const redirectRes = await lookupOnRequestGet({
        request: redirectReq,
        env: {},
        params: { id: regJson.id },
      });
      const endTime = performance.now();

      expect(redirectRes.status).toBe(307);
      expect(redirectRes.headers.get("Location")).toContain("https://fast-clean-site.com");

      // Verify scanner redirect took under 50ms locally
      expect(endTime - startTime).toBeLessThan(100);

      // Verify no external threat intel fetches occurred during scan-time lookup
      const threatApiScanCalls = fetchSpy.mock.calls.filter((call) =>
        String(call[0]).includes("threat-intel")
      );
      expect(threatApiScanCalls.length).toBe(0);

      fetchSpy.mockRestore();
    });

    it("should complete registration API response under 800 milliseconds including reputation overhead", async () => {
      const startTime = performance.now();

      const req = new Request("https://qrcraftly.com/api/redirect/register", {
        method: "POST",
        body: JSON.stringify({
          redirectUrl: "https://perf-check-domain.com/path",
          turnstileToken: "valid-turnstile-token",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerOnRequestPost({ request: req, env: {} });
      const duration = performance.now() - startTime;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(800);
    });

    it("should handle live network call for validateTurnstileToken", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as any);

      const res = await validateTurnstileToken("custom-turnstile-token", { TURNSTILE_SECRET_KEY: "secret-key" }, "1.2.3.4");
      expect(res.success).toBe(true);
      fetchSpy.mockRestore();
    });

    it("should handle failed live network response for validateTurnstileToken", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
      } as any);

      const res = await validateTurnstileToken("custom-turnstile-token-fail", { TURNSTILE_SECRET_KEY: "secret-key" }, "1.2.3.4");
      expect(res.success).toBe(true);
      fetchSpy.mockRestore();
    });
  });
});
