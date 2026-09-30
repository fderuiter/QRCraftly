---
publish-approved: true
---

# Edge Architecture and Zero-Knowledge Privacy Specification

> **Status: not deployed.** Production serves static files only (Cloudflare Workers Static Assets with no Worker script). No edge rendering, database, redirect service or scan counting runs today, and dynamic QR codes are switched off in the app. This page describes a design kept in the repository; if it is ever turned on, the [QRCraftly Pledge](https://qrcraftly.com/free-forever) and the privacy notes will be updated first.

## Executive Summary

QRCraftly is served by **Cloudflare Workers with Static Assets** (ADR 0012). Every page is pre-rendered at build time (Vike SSG) and served from `dist/client`; there is no edge server-side rendering. Core QR code generation, canvas rendering, and scannability diagnostics run locally on client devices via Web Workers.

The only server-side feature is **Zero-Knowledge Redirection** (dynamic QR codes): a small Worker entry (`src/packages/edge-redirect/worker.ts`) stores client-encrypted destinations in Cloudflare D1 and serves the `/r/<id>` resolver. Destinations are encrypted in the browser with AES-GCM and the decryption key lives only in the URL fragment (`#key=...`), so the edge never sees a destination URL.

> **Status: implemented, not enabled.** The Worker entry, its hardening and its tests are in the repository, but `wrangler.jsonc` has no `main`, no Rate Limiting binding and a placeholder D1 `database_id`, and the UI flags `ENABLE_DYNAMIC_TRACKING` / `ENABLE_DYNAMIC_DASHBOARD` are `false`. Production serves static assets only. Follow the [enablement checklist](#enablement-checklist) to turn it on.

---

## Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                  Client Browser                                   |
|  QR generation in Web Workers    |  Web Crypto AES-GCM, key in #key=... fragment  |
+----------------------------------------|------------------------------------------+
                                         | GET /r/<id>  (fragment never sent)
                                         | GET /api/redirect/<id>
                                         v
+-----------------------------------------------------------------------------------+
|                 Cloudflare Workers with Static Assets (one Worker)                |
|  1. Request matches a file in dist/client  -> served by the asset pipeline        |
|  2. Otherwise the Worker entry runs (src/packages/edge-redirect/worker.ts):       |
|     /api/redirect/*  -> redirect API (D1, Rate Limiting, Turnstile)               |
|     /r/<id>          -> static resolver shell /r/shell/ (404 if id unknown)       |
|     anything else    -> env.ASSETS (a real 404 stays a 404)                       |
+-----------------------------------------------------------------------------------+
```

`src/packages/edge-redirect/` is a deep module: `index.ts` (API), `worker.ts` (Worker entry), `dev.ts` (Vite dev middleware and in-memory mock D1), `schema.sql` (D1 schema).

---

## Dynamic Redirect API

| Route                         | Method | Purpose                                                 | Rate limit binding   |
| :---------------------------- | :----- | :------------------------------------------------------ | :------------------- |
| `/api/redirect/register`      | POST   | Store a new redirect; returns `201 { id, adminKey }`    | `WRITE_RATE_LIMITER` |
| `/api/redirect/update`        | POST   | Replace destinations, authorized by `adminKey`          | `WRITE_RATE_LIMITER` |
| `/api/redirect/<id>`          | GET    | Return the ciphertext for the resolver; count the scan  | `READ_RATE_LIMITER`  |
| `/api/redirect/stats?id=<id>` | GET    | Return `{ id, scans, createdAt }`                       | `READ_RATE_LIMITER`  |
| `/r/<id>`                     | GET    | Serve the resolver shell, or a real 404 for unknown ids | `READ_RATE_LIMITER`  |

### Hardening rules

- **Ciphertext only.** `redirectUrl`, `iosUrl` and `androidUrl` must be `enc:v1:<24 hex IV>:<hex ciphertext>`; plaintext is rejected with 400, so the API can never act as an open redirector, and it never answers with a 3xx. Because the server cannot read ciphertext, it runs no URL reputation check (#928); register and update share one validation path, so update is vetted exactly like register. The resolver page re-validates the decrypted URL (http/https only, dangerous schemes blocked) before navigating.
- **Input limits.** JSON bodies only (`415` otherwise), capped at 16 KiB (`413`); each destination is capped at the ciphertext length of a 2048-byte URL; ids must be UUIDs and admin keys 32 hex characters. Wrong types answer `400`, never `500`, and error bodies never echo internal exception text.
- **Turnstile.** Registration requires a Cloudflare Turnstile token verified with siteverify. There are no bypass tokens and no fallback secret in production code: if `TURNSTILE_SECRET_KEY` is missing, or siteverify is unreachable or errors, registration fails closed (`503`); a rejected token answers `403`. Tests and the dev server inject their own verifier.
- **Rate limiting on every route** through the Cloudflare [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), keyed per route and `CF-Connecting-IP`. If `WRITE_RATE_LIMITER` is missing or errors, writes fail closed with `429`. If `READ_RATE_LIMITER` is missing or errors, reads fall back to a per-isolate limiter (120 requests per minute per client, at most 1000 tracked clients). A missing binding never produces a `5xx`.
- **Origins.** Writes need an `Origin` (or `Referer`) equal to the request's own origin (covers branch previews and local dev), `https://qrcraftly.com`, `https://qrcraftly.fpderuiter.workers.dev` or `https://dev-qrcraftly.fpderuiter.workers.dev`, or an origin listed in the optional `ALLOWED_ORIGINS` variable (comma separated). Anything else, or no header at all, is `403`.
- **Admin keys** are 128-bit random values returned once to the browser; D1 stores only their SHA-256 hash, compared in constant time.
- **No stale destinations, no unbounded caches.** There is no KV and no module-level record cache; every lookup reads D1 and API responses are `Cache-Control: no-store`, so an update is visible on the next scan. (`caches.default` purges are per data centre, so caching destinations could not guarantee this.) The only in-memory state is the bounded fallback limiter.
- **Real 404s.** Unknown paths fall through to the static assets binding and keep its `404`. Unknown or malformed `/r/<id>` ids get a `404` with the static 404 page, never a cached soft `200`.
- **Crawlers and the service worker.** `/r/*` and `/api/*` are `Disallow`ed in `robots.txt` and sent with `X-Robots-Tag: noindex`; the service worker never serves `/r/*` from cache, so a scan always reaches the Worker.

### Scan counting

`GET /api/redirect/<id>` runs `UPDATE redirects SET scans = scans + 1 WHERE id = ?` in `ctx.waitUntil()`. A failed increment is logged and does not fail the lookup.

---

## Free-Tier Budget

Everything fits the Cloudflare Workers free plan. Each scan costs one Worker request for `/r/<id>` (plus one D1 row read) and one for `/api/redirect/<id>` (one D1 row read and one D1 row write).

| Resource        | Free allowance  | Cost per scan        | Scans per day before the limit |
| :-------------- | :-------------- | :------------------- | :----------------------------- |
| Worker requests | 100,000 / day   | 2                    | about 50,000                   |
| D1 rows read    | 5,000,000 / day | 2                    | about 2,500,000                |
| D1 rows written | 100,000 / day   | 1                    | about 100,000                  |
| D1 storage      | 5 GB            | under 10 KB per link | not a practical limit          |
| Rate Limiting   | included        | no extra cost        | not a limit                    |

Static asset requests are free and unlimited and never invoke the Worker.

---

## Local Development

`pnpm dev` needs no Cloudflare credentials. A Vite plugin in `vite.config.ts` mounts `createDevRedirectMiddleware()` from `src/packages/edge-redirect/dev.ts`, which serves `/api/redirect/*` from an in-memory mock D1 with in-memory rate limiters. Its Turnstile verifier accepts any non-empty token, and the dev UI offers a "Skip bot check (local dev only)" button when no `VITE_TURNSTILE_SITE_KEY` is set. `/r/<id>` needs no middleware in dev because Vike renders the resolver page directly. Data is lost when the dev server restarts.

---

## Enablement Checklist

Run these steps in order, on the `dev` branch first (preview staging), then promote.

1. **Create the D1 database** (once) and note the printed `database_id`:
   ```bash
   pnpm exec wrangler d1 create qrcraftly-db
   ```
2. **Apply the schema** to the remote database:
   ```bash
   pnpm exec wrangler d1 execute qrcraftly-db --remote --file=src/packages/edge-redirect/schema.sql
   ```
3. **Create a Turnstile widget** in the Cloudflare dashboard for `qrcraftly.com`, `qrcraftly.fpderuiter.workers.dev` and `dev-qrcraftly.fpderuiter.workers.dev`. Store the secret with `pnpm exec wrangler secret put TURNSTILE_SECRET_KEY`, and set the public site key as the build variable `VITE_TURNSTILE_SITE_KEY` in Workers Builds.
4. **Edit `wrangler.jsonc`**: add the Worker entry and the assets binding, replace the placeholder `database_id`, and add both Rate Limiting bindings (each `namespace_id` is any integer string unique in the account; `period` must be 10 or 60):
   ```jsonc
   {
     "name": "qrcraftly",
     "main": "src/packages/edge-redirect/worker.ts",
     "compatibility_date": "2024-09-23",
     "assets": { "directory": "dist/client", "binding": "ASSETS" },
     "d1_databases": [
       {
         "binding": "DB",
         "database_name": "qrcraftly-db",
         "database_id": "<id from step 1>",
       },
     ],
     "ratelimits": [
       {
         "name": "WRITE_RATE_LIMITER",
         "namespace_id": "1001",
         "simple": { "limit": 10, "period": 60 },
       },
       {
         "name": "READ_RATE_LIMITER",
         "namespace_id": "1002",
         "simple": { "limit": 120, "period": 60 },
       },
     ],
   }
   ```
5. **Allow Turnstile in the CSP.** Add `https://challenges.cloudflare.com` to `script-src` and add `frame-src https://challenges.cloudflare.com` in both the CSP meta tag in `src/layouts/Head.tsx` and `baseCspPattern` in `scripts/csp_hash_injector.js`. This is not done yet on purpose: while the feature is off, the widget is never rendered and the CSP stays strict.
6. **Flip the flags**: `ENABLE_DYNAMIC_TRACKING` in `src/components/inputs/UrlInput.tsx` and `ENABLE_DYNAMIC_DASHBOARD` in `src/pages/dynamic-dashboard/+Page.tsx`, and restore the dashboard link in `src/components/QRTool.tsx` that #917 removed (commit `f8a51a9`).
7. **Verify on preview staging** (`https://dev-qrcraftly.fpderuiter.workers.dev/`): create a dynamic link, scan it, update it, check that the next scan uses the new destination, that `/r/<random uuid>` returns 404, and that `POST /api/redirect/register` from another origin returns 403. Then run `pnpm run release:promote`.

---

## Zero-Knowledge Privacy Boundaries & Hash Isolation

For applications requiring strict payload privacy (e.g., medical records, sensitive documents, confidential redirect links), QRCraftly provides client-side zero-knowledge encryption.

```
+-----------------------------------------------------------------------------------+
|                       Zero-Knowledge Encrypted Resolution Flow                     |
|                                                                                   |
| 1. User Browser Generates Key & Encrypts Payload Locally                          |
|    - Secret Key: K (256-bit AES-GCM) generated via window.crypto.subtle              |
|    - Ciphertext: C = enc:v1:<iv>:<ciphertext>                                     |
|    - Dynamic Link URL: https://qrcraftly.com/r/abc123#key=K                       |
|                                                                                   |
| 2. HTTP Request Transmitted to Edge Server                                        |
|    - Sent Over Wire: GET /r/abc123 HTTP/1.1                                       |
|    - RFC 3986 Isolation: Anchor Hash (#key=K) is NEVER sent in HTTP GET request!  |
|                                                                                   |
| 3. Edge Server Resolves Payload                                                   |
|    - Reads record: target = enc:v1:<iv>:<ciphertext>                              |
|    - Detects encrypted format via isEncrypted() test                              |
|    - GET /api/redirect/abc123 returns HTTP 200 JSON with the ciphertext           |
|    - Server sees ONLY ciphertext; decryption key K is completely unknown to edge  |
|                                                                                   |
| 4. Client Browser Performs In-Memory Decryption                                   |
|    - JavaScript extracts K from window.location.hash                              |
|    - Web Crypto API decrypts ciphertext locally in browser memory                 |
|    - Browser redirects user to decrypted destination URL                          |
+-----------------------------------------------------------------------------------+
```

### Technical Implementation Details

1. **Client-Side Web Crypto API (`src/packages/edge-redirect/client.ts`):**
   - Symmetric 256-bit AES-GCM encryption key generation via `window.crypto.subtle.generateKey()`.
   - Payload format: `enc:v1:<iv_hex>:<ciphertext_hex>` using a 12-byte (96-bit) cryptographically random Initialization Vector (IV).
2. **Anchor Hash Fragment Isolation (RFC 3986):**
   - According to RFC 3986 Section 3.5, URI fragment identifiers (`#...`) are processed exclusively by user agents (browsers) and are **never** included in HTTP request URIs sent over the network.
   - When a user scans or visits `https://qrcraftly.com/r/abc123#key=4f8a...`, the browser sends `GET /r/abc123` to the Cloudflare Worker, which returns the static resolver shell. The `#key=4f8a...` fragment remains strictly isolated in the client browser's memory (`window.location.hash`).
3. **Zero-Knowledge Resolution & Delivery:**
   - The API accepts only `enc:v1:` ciphertext and never answers with an HTTP redirect. `GET /api/redirect/<id>` returns HTTP 200 JSON containing the ciphertext.
   - Client-side browser script extracts the key from `window.location.hash` using `extractKeyFromHash()`, executes `decryptUrl()`, and performs client-side navigation.
4. **Data Sovereignty Guarantee:**
   - Edge servers, Cloudflare D1 databases, and network log aggregators never receive, store, or process the unencrypted destination URL or the decryption key.
   - Complete zero-knowledge payload privacy is guaranteed by mathematical encryption and browser network protocols.
