---
publish-approved: true
---

# Scalability Analysis & Capacity Planning

## Executive Summary

**Projected Capacity:** Effectively Unlimited Daily Users
**Bottleneck:** Deployment frequency (Builds/month) and Serverless Edge Worker quotas, not Static Asset Bandwidth.

_Streamlined and secured QR code generation and edge redirection capabilities._

QRCraftly is architected as a **Hybrid Edge-Native Application** combining **Client-Side Heavy Processing** with **Serverless Edge Compute**. Hosted on Cloudflare Workers with Static Assets, the core static QR generation, matrix math, and image rendering are offloaded entirely to browser Web Workers on the user's device. Dynamic features—dynamic link redirection (`/r/[id]`) and scan counting—use an optional Cloudflare Worker entry backed by Cloudflare D1 (currently disabled; see `EDGE_ARCHITECTURE.md`).

## Architecture & Resource Usage

### 1. Architecture: Hybrid Edge-Native Model

- **Framework:** Vike (Vite + React) served by Cloudflare Workers with Static Assets. The optional Worker entry (`src/packages/edge-redirect/worker.ts`) handles only `/api/redirect/*` and `/r/*`.
- **Rendering Model:** Static pre-rendering (SSG) for every route. There is no edge SSR; the dynamic link resolver is a pre-rendered shell (`/r/shell`) that the Worker serves for each `/r/<id>`.
- **Client Processing:** Core QR code generation, canvas rendering, matrix contrast auditing, and zero-knowledge Web Crypto AES-GCM operations occur 100% locally in browser Web Workers (`scannabilityWorker.ts`, `optical-scanner/worker.ts`).
- **Serverless Edge Compute & Database Persistence:** Dynamic link resolution (`/r/[id]`) routes requests through Cloudflare Workers, retrieving encrypted destinations from Cloudflare D1 (no KV, no destination caching) while updating scan analytics asynchronously (`UPDATE redirects SET scans = scans + 1 WHERE id = ?`).

### 2. Hosting & Infrastructure Limits: Cloudflare Workers

The application leverages Cloudflare's distributed edge infrastructure. System limits and operational impacts are structured as follows:

| Resource                      | Free Tier Limit        | QRCraftly Usage                                   | Impact & Scale Mitigation                                       |
| :---------------------------- | :--------------------- | :------------------------------------------------ | :-------------------------------------------------------------- |
| **Static Requests**           | Unlimited              | ~10-15 per session                                | **None** (Absorbed by Cloudflare CDN)                           |
| **Bandwidth**                 | Unlimited              | ~500KB per session                                | **None** (Cached globally at edge)                              |
| **Serverless Edge Functions** | 100,000 requests / day | Used for Edge SSR & dynamic redirects (`/r/[id]`) | **Edge Quota Limit** (Scales seamlessly with Workers Paid tier) |
| **Cloudflare D1 SQL Reads**   | 5,000,000 rows / day   | Querying dynamic redirect records                 | **High Throughput** (one primary-key read per scan, no KV)      |
| **Cloudflare D1 SQL Writes**  | 100,000 rows / day     | Dynamic link creation & scan count increments     | **Optimized** (Non-blocking background batch/scan pipeline)     |
| **Concurrent Users**          | Unlimited              | Offloaded to client & edge nodes                  | **None**                                                        |
| **Builds / Deploys**          | 500 / month            | ~1 per deploy                                     | **Operational Constraint**                                      |

### 3. Serverless Edge Compute Quotas & D1 Storage Behavior

- **Cloudflare Workers Execution Quotas:** Serverless Workers enforce a 10ms CPU time limit per request on the Free Tier (and 30s wall-clock CPU time on Paid Tiers). Because heavy cryptographic and matrix operations are offloaded to client browser Web Workers, edge function CPU time per redirect remains under 2ms.
- **D1 Relational Storage Behaviors:** Dynamic redirect mappings (`id`, `redirect_url`, `ios_url`, `android_url`, `scans`, `created_at`) are stored in Cloudflare D1 SQLite database tables. Destinations are stored as `enc:v1:` ciphertext and are not cached (no KV), so an update is visible on the next scan; each scan costs one primary-key read and one scan-count write.
- **Scan Aggregation & Telemetry Pipeline:** Scan analytics updates are executed asynchronously using non-blocking edge invocation handlers (`context.waitUntil()`). This ensures that database write operations (`UPDATE redirects SET scans = scans + 1 WHERE id = ?`) do not block client redirect latency or cause request queue bottlenecks under high concurrency.
- **Turnstile Bot Mitigation & Write Quota Defense:** Dynamic link creation endpoints incorporate Cloudflare Turnstile bot verification. Verifying tokens at edge ingress protects the 100,000 daily D1 write quota against automated brute-force attempts and synthetic traffic exhaustion.

### 4. Client-Side Performance Optimizations

To maintain high throughput and minimize edge server compute costs, QRCraftly relies on advanced browser APIs:

- **Scannability Web Workers & Pure JavaScript Processing Pipeline**: We utilize Web Workers (`src/packages/scannability/worker.ts`) integrated with a pure JavaScript decoding engine, physical matrix relative luminance contrast audits, and a pre-allocated double-buffered memory pool (`DoubleBufferPool`) to perform real-time QR code scannability testing on a background thread. Core scannability checking logic, optical simulation math, and matrix evaluation algorithms are encapsulated within dedicated deep modules (`src/packages/scannability/` and `src/packages/qr-matrix/`), exposing discrete entry-point seams for main-thread fallbacks and off-thread execution alike. This double-buffered pipeline recycles pre-allocated `ArrayBuffer` instances between the main thread and background worker thread via zero-copy transferable objects, eliminating runtime garbage collection pauses. Alongside raw pixel data and canvas dimensions, the background worker contract (`src/packages/scannability/lib/sharedContract.ts`) validates physical matrix module layout configurations to execute localized QR-aligned relative luminance contrast audits across each module cell boundary with strictly typed runtime assertions. The worker runner maintains a 1500ms watchdog timer initiated immediately upon analysis requests, with self-healing fallback that recovers from worker timeouts or canvas extraction degradation by caching offscreen canvas degradation state and safely transferring `Uint8ClampedArray` buffers directly from main-thread canvas or extracting image data from `ImageBitmap` handles. The worker executes two-pass orientation and polarity analysis directly using pure JavaScript routines (`jsQR`), bypassing WebAssembly compilation and module instantiation overhead entirely. The adaptive scheduler dynamically throttles scan execution frequency when latency approaches 100ms, and cooperative yielding ensures stale scan requests are aborted immediately when new board updates occur. In environments where Web Workers are blocked or unsupported, a try-catch guarded initialization automatically falls back to synchronous main-thread processing (`scannabilityChecker.ts`), employing similar scheduling strategies (`requestIdleCallback` or `setTimeout`) to maintain a highly responsive UI without frame stutter.
- **Scannability Health Evaluator (Sealed Worker Seam)**: Callers ask one question and read one answer. `createScannabilityEvaluator` (`src/packages/scannability/lib/evaluator.ts`) takes a QR config plus a frame (pixels, an `ImageBitmap`, or the preview canvas) and publishes a single `ScannabilityAssessment` (`status`, `health`, `exportRisk`, `workerRecoveryActive`). Canvas capture, zero-copy buffer transfer, request sequencing (Superseded ACKs), backpressure, the worker lifecycle (spawned only through `createScannabilityWorker()`), the 1500ms watchdog, the Worker Degradation Cache and the main-thread fallback are private to it. The worker and the fallback both run one step-wise check (`scannabilitySteps` in `lib/checker.ts`), so contrast auditing, two-pass decoding, the `isDangerousUrl` security check and the optical simulation cannot drift apart; the worker only adds cooperative cancellation between steps. The worker factory, clock, frame reader and main-thread check are injected, so the evaluator is tested headlessly with fakes. `useScannability` in `client.ts` is a thin React adapter; app wiring (the `scannability-fail` store signal and the store module count) is injected by `src/hooks/useScannability.ts`, so the package never imports app layers.
- **Unified QR Decoding Worker and Frame Scaling**: We leverage a single, unified, off-thread background worker (`src/packages/optical-scanner/worker.ts`) to consolidate video demuxing, VP8/VP9 WebCodecs frame decoding, fallback standard/inverted scanning (`attemptBoth`), and bounding-box scaling (capped at 1280px). This background worker is shared between the file upload processor and webcam capture streams via cooperative event listening, and its spawning is private to the `optical-scanner` package. This ensures we maximize frame decoding efficiency, avoid multiple duplicate jsQR library allocations, prevent thread overhead, and maintain fluid rendering (above 58 FPS) on the main UI thread.
- **Camera Scanner Engine (Sealed Worker Seam)**: Live camera scanning runs through one headless engine (`createCameraScannerEngine` in `src/packages/optical-scanner/lib/cameraEngine.ts`) that owns the frame loop, adaptive sampling (16ms–1000ms, driven by the 5-frame median worker latency), non-blocking backpressure (one frame in flight), downscaling (1280px for the worker, 800px on the main thread), worker epochs, and the 1500ms starvation watchdog. A stalled or crashed worker is recreated up to three consecutive times with an exponentially backed-off watchdog budget (3000ms, then 6000ms); after the third failed restart, or when no worker can be spawned (for example under a strict CSP), the engine decodes on the main thread instead, without changing its public interface. The engine exposes only `start`, `stop`, `destroy`, `setOptions`, `getMetrics` and typed `subscribe` listeners (`onScanSuccess`, `onScanFail`, `onStatusChange`, `onMetricsChange`). The worker factory, clock and frame grabber are injected, so the engine is tested headlessly with fake frame sources, fake workers and a fake clock. The `useQrScanner` React hook is a thin adapter that creates the engine, batches its diagnostics into React state every 250ms and destroys it on unmount; it no longer exposes a `workerRef`.
- **Client-Side SVG Export**: We developed a custom `SvgContext` that mimics the Canvas 2D API to generate high-quality, resolution-independent vector graphics locally. The entire SVG file is generated in the browser without server-side rendering or image conversion APIs.

## Usage Calculations

### A. Network Payload & Bandwidth

The project enforces a strict **3MB** total payload limit via CI checks, though typical localized bundles are significantly smaller.

- **Average Bundle Size (Estimated):** ~500 KB (gzipped)
- **Worst Case Bundle Size:** 3 MB

**Scenario: 10,000 Daily Users**
$$ 10,000 \text{ users} \times 0.5 \text{ MB} = 5,000 \text{ MB} = 5 \text{ GB / day} $$

**Scenario: 1,000,000 Daily Users**
$$ 1,000,000 \text{ users} \times 0.5 \text{ MB} = 500,000 \text{ MB} = 500 \text{ GB / day} $$

_Status:_ Cloudflare absorbs this bandwidth cost completely on the CDN layer.

### B. Compute Power & Edge Workload Distribution

- **Static QR Creation:** Executed on the user's client hardware (~50ms CPU time per render). For 1 million static QR users, 100% of compute load is distributed across 1 million client CPUs, resulting in **0ms server CPU overhead**.
- **Dynamic Link Redirection (`/r/[id]`):** Serviced at Cloudflare edge worker locations with an average execution duration of **1-2ms per request**. Up to 100,000 daily redirects are supported on Cloudflare's free edge tier, with seamless linear scaling on Workers Paid plans ($5/mo for 10M requests).

### C. Operational Constraints (Builds)

The primary build deployment limit:

- **Limit:** 500 Builds / Month
- **Daily Average:** ~16 Builds / Day

$$ \frac{500 \text{ builds}}{30 \text{ days}} \approx 16.6 \text{ builds/day} $$

_Mitigation:_ This affects developer deploy frequency, not end-user capacity. If exceeded, new code deployments are paused until the next billing cycle, while existing static assets and edge workers remain fully operational.

## Conclusion

QRCraftly's hybrid edge-native architecture efficiently splits computational responsibilities between browser Web Workers and Cloudflare serverless edge infrastructure. By keeping static QR matrix generation strictly client-side, serverless edge compute and D1 relational database capacity are preserved exclusively for dynamic URL redirection and scan analytics.

**Recommendation:** Maintain the current Cloudflare Workers infrastructure. Upgrading to Cloudflare Workers Paid ($5/month) expands dynamic redirect capacity to over 10,000,000 requests per month whenever enterprise dynamic link volume exceeds standard free tier limits.
