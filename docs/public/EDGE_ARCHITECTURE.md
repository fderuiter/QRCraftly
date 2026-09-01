---
publish-approved: true
---

# Edge Architecture and Zero-Knowledge Privacy Specification

## Executive Summary

QRCraftly operates on a hybrid edge-native architecture that combines browser-bound static code execution with Cloudflare Workers / Pages Functions serverless edge compute and Cloudflare D1 relational database persistence. While core QR code generation, canvas rendering, and scannability diagnostics are performed locally on client devices via Web Workers, dynamic redirection services (`/r/[id]`), edge server-side rendering (Vike SSR), and high-concurrency scan analytics leverage distributed edge infrastructure.

To preserve end-to-end data privacy across dynamic workflows, QRCraftly implements a client-side zero-knowledge encryption protocol using the Web Crypto API (`AES-GCM`). Decryption keys are stored exclusively in URL anchor hash fragments (`#key=...`), ensuring sensitive target payloads remain isolated in browser memory and are never exposed to edge servers, database stores, or transit logs.

---

## Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                  Client Browser                                   |
|  +---------------------------+   +---------------------------------------------+  |
|  | Web Workers & Canvas      |   | Web Crypto API (AES-GCM)                    |  |
|  | (Static QR Generation)    |   | Decryption Key in Anchor Hash (#key=...)    |  |
|  +---------------------------+   +---------------------------------------------+  |
+----------------------------------------|------------------------------------------+
                                         | HTTP GET /r/[id] (Hash fragment isolated in browser)
                                         v
+-----------------------------------------------------------------------------------+
|                             Cloudflare Edge Network                               |
|  +-----------------------------------------------------------------------------+  |
|  | Vike SSR & Pages Functions Catch-All Interceptor ([[path]].ts)             |  |
|  | - Evaluates Cache Control & Bypass Rules                                    |  |
|  | - Pre-renders Dynamic Routes                                                |  |
|  +-----------------------------------------------------------------------------+  |
|                                        |                                          |
|  +-------------------------------------v---------------------------------------+  |
|  | Dynamic Redirect Engine (/r/[id].ts)                                        |  |
|  | 1. Read from KV Edge Cache (redirect:<id>)                                 |  |
|  | 2. Fallback to Primary Cloudflare D1 Relational SQL Database                 |  |
|  | 3. Asynchronous Non-Blocking Scan Counter & Telemetry (waitUntil)          |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## Edge Server-Side Rendering (SSR)

Server-side pre-rendering and dynamic routing are handled at the edge through Vike and Cloudflare Pages Functions:

1. **Edge Request Interception (`functions/[[path]].ts`):**
   - Incoming HTTP requests on dynamic, non-static paths are intercepted by a universal Cloudflare Pages Functions catch-all worker.
   - Static assets (`/assets/*`) and pre-rendered SSG routes are immediately delegated to Cloudflare Pages static asset storage via `context.next()`.
2. **Vike Edge SSR Engine:**
   - Uncached dynamic route requests invoke the Vike server bundle at edge locations close to the end user.
   - The engine constructs page context (`urlOriginal`, `userAgent`, headers) and executes edge server rendering to return pre-rendered HTML with minimal TTFB (Time to First Byte).
3. **API Routing Decoupling:**
   - API routes residing under `/api/*` bypass HTML rendering pipelines and route directly to lightweight serverless function handlers.

---

## Dynamic Link Redirection & D1 Database Architecture

Dynamic QR links route users through edge functions to resolve target URLs, apply platform-specific routing rules, and track usage analytics.

### Redirection Execution Flow (`/r/[id]`)

When a user scans a dynamic QR code pointing to `/r/[id]`:

1. **KV Edge Cache Lookup:**
   - The edge handler (`functions/api/redirect/[id].ts`) checks the Cloudflare KV store for `redirect:<id>`.
   - On a cache hit, the handler retrieves pre-indexed target metadata without querying the primary SQL database.
2. **Primary D1 Relational Query:**
   - On a cache miss, the handler queries Cloudflare D1 SQL database (`SELECT * FROM redirects WHERE id = ?`).
   - Upon successful retrieval, the record is asynchronously written to KV edge storage to accelerate subsequent requests.
3. **Device & OS Specific Targeting:**
   - User-Agent headers are evaluated at the edge to route users conditionally based on operating system rules (`ios_url`, `android_url`, or default `redirect_url`).
4. **Asynchronous Non-Blocking Scan Tracking:**
   - Scan counts and diagnostic events (timestamp, device category, geo-location region) are processed asynchronously via `context.waitUntil()`.
   - The edge worker executes an atomic SQL increment (`UPDATE redirects SET scans = scans + 1 WHERE id = ?`) and persists event logs to KV.
   - Because telemetry processing runs in the background, client redirect latency is completely decoupled from database write overhead.

### Bot Verification & Abuse Mitigation (Cloudflare Turnstile)

Dynamic redirection record creation requires client-side Cloudflare Turnstile bot verification. Prior to committing a new redirect mapping to Cloudflare D1, the edge creation handler validates the Turnstile response token against Cloudflare's verification API. This blocks automated scrapers, denial-of-wallet attempts, and unauthorized edge write exhaustion while preserving seamless user experience for humans.

---

## Caching Tiers & Cache Invalidation Rules

QRCraftly employs a multi-tiered edge caching strategy to balance low latency with immediate configuration updates.

### Caching Layers

| Layer      | Component       | Mechanism                         | Expiration / Control                 |
| :--------- | :-------------- | :-------------------------------- | :----------------------------------- |
| **Tier 1** | KV Edge Cache   | Key-Value Store (`redirect:<id>`) | High-speed global edge read cache    |
| **Tier 2** | Edge HTML Cache | Cloudflare CDN (`caches.default`) | Pre-rendered Vike SSR HTML responses |
| **Tier 3** | Browser Cache   | HTTP Response Headers             | Client-side HTTP response directives |

### Cache Bypass Rules

To allow instant dynamic link configuration updates and force re-validation, the edge engine evaluates explicit bypass criteria on incoming requests:

- **Query Parameter Directives:** Requests containing `bypass-cache`, `bypass=true`, `purge=true`, `nocache=true`, or `refresh=true`.
- **HTTP Header Directives:** Requests containing `Cache-Control: no-cache`, `Cache-Control: no-store`, `Pragma: no-cache`, or `X-Bypass-Cache: 1`.

When bypass rules match, the edge worker bypasses Tier 1 and Tier 2 caches, fetches fresh records directly from the Cloudflare D1 SQL database, and updates the edge cache tiers.

---

## Static Fallback & Operational Resiliency

QRCraftly guarantees uninterrupted core functionality even during Cloudflare Workers, KV, or D1 database outages:

1. **Static Asset Fallback (`context.next()`):**
   - If edge server-side rendering fails or encounters uncaught runtime exceptions, request execution gracefully degrades to static asset serving.
2. **Offline Core Generator:**
   - Standard static QR code generation (URLs, text, WiFi credentials, vCards) operates 100% inside the browser using Web Workers (`scannabilityWorker.ts`) and HTML5 Canvas APIs.
   - Static QR creation has zero dependence on Cloudflare Workers, D1 database connections, or active internet connectivity once static assets are cached by the browser service worker.
3. **Database Fail-Open Behavior:**
   - If D1 database queries fail or exceed timeout thresholds during dynamic link resolution, the system attempts a fallback read against KV edge cache.
   - If scan tracking updates fail, the redirect response completes successfully without blocking the user (fail-open model).

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
|    - Returns HTTP 200 JSON: { "redirectUrl": "enc:v1:<iv>:<ciphertext>" }         |
|    - Server sees ONLY ciphertext; decryption key K is completely unknown to edge  |
|                                                                                   |
| 4. Client Browser Performs In-Memory Decryption                                   |
|    - JavaScript extracts K from window.location.hash                              |
|    - Web Crypto API decrypts ciphertext locally in browser memory                 |
|    - Browser redirects user to decrypted destination URL                          |
+-----------------------------------------------------------------------------------+
```

### Technical Implementation Details

1. **Client-Side Web Crypto API (`src/utils/encryption.ts`):**
   - Symmetric 256-bit AES-GCM encryption key generation via `window.crypto.subtle.generateKey()`.
   - Payload format: `enc:v1:<iv_hex>:<ciphertext_hex>` using a 12-byte (96-bit) cryptographically random Initialization Vector (IV).
2. **Anchor Hash Fragment Isolation (RFC 3986):**
   - According to RFC 3986 Section 3.5, URI fragment identifiers (`#...`) are processed exclusively by user agents (browsers) and are **never** included in HTTP request URIs sent over the network.
   - When a user scans or visits `https://qrcraftly.com/r/abc123#key=4f8a...`, the browser sends `GET /r/abc123` to the Cloudflare edge worker. The `#key=4f8a...` fragment remains strictly isolated in the client browser's memory (`window.location.hash`).
3. **Zero-Knowledge Resolution & Delivery:**
   - The edge worker (`/r/[id]`) inspects the stored destination payload. When `isEncrypted(payload)` returns `true`, the worker bypasses HTTP 307 auto-redirection and returns an HTTP 200 response with JSON containing the encrypted string.
   - Client-side browser script extracts the key from `window.location.hash` using `extractKeyFromHash()`, executes `decryptUrl()`, and performs client-side navigation.
4. **Data Sovereignty Guarantee:**
   - Edge servers, Cloudflare D1 databases, KV stores, and network log aggregators never receive, store, or process the unencrypted destination URL or the decryption key.
   - Complete zero-knowledge payload privacy is guaranteed by mathematical encryption and browser network protocols.
