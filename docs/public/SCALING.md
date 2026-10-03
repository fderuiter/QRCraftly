---
publish-approved: true
audience: developers # internal developer documentation, not published on /security
---

# Scalability Analysis & Capacity Planning

## Executive Summary

**Projected Capacity:** Effectively Unlimited Daily Users
**Bottleneck:** Deployment frequency (Builds/month), not Static Asset Bandwidth.

_Streamlined and secured client-side QR code generation._

QRCraftly is a **Static, Client-Side Application**. Hosted on Cloudflare Workers with Static Assets, it serves pre-rendered files only; QR generation, matrix math and image rendering run entirely on the user's device, much of it in browser Web Workers. There is no server code, database or redirect service ([ADR 0022](../adr/0022-no-dynamic-qr-codes-client-side-only.md)).

## Architecture & Resource Usage

### 1. Architecture: Static Assets, Client-Side Compute

- **Framework:** Vike (Vite + React) served by Cloudflare Workers with Static Assets, with no Worker script (`wrangler.jsonc` has no `main` entry).
- **Rendering Model:** Static pre-rendering (SSG) for every route. There is no edge SSR.
- **Client Processing:** Core QR code generation, canvas rendering and matrix contrast auditing occur 100% locally in the browser, with heavy work in Web Workers (`src/packages/scannability/worker.ts`, `src/packages/optical-scanner/worker.ts`).

### 2. Hosting & Infrastructure Limits: Cloudflare Workers

The application leverages Cloudflare's distributed edge infrastructure. System limits and operational impacts are structured as follows:

| Resource             | Free Tier Limit | QRCraftly Usage     | Impact & Scale Mitigation             |
| :------------------- | :-------------- | :------------------ | :------------------------------------ |
| **Static Requests**  | Unlimited       | ~10-15 per session  | **None** (Absorbed by Cloudflare CDN) |
| **Bandwidth**        | Unlimited       | ~500KB per session  | **None** (Cached globally at edge)    |
| **Concurrent Users** | Unlimited       | Offloaded to client | **None**                              |
| **Builds / Deploys** | 500 / month     | ~1 per deploy       | **Operational Constraint**            |

### 3. Client-Side Performance Optimizations

To maintain high throughput and minimize edge server compute costs, QRCraftly relies on advanced browser APIs:

- **Scannability Web Workers & Pure JavaScript Processing Pipeline**: We utilize Web Workers (`src/packages/scannability/worker.ts`) integrated with a pure JavaScript decoding engine, physical matrix relative luminance contrast audits, and transferable pixel buffers to perform real-time QR code scannability testing on a background thread. Core scannability checking logic, optical simulation math, and matrix evaluation algorithms are encapsulated within dedicated deep modules (`src/packages/scannability/` and `src/packages/qr-matrix/`), exposing discrete entry-point seams for main-thread fallbacks and off-thread execution alike. The pixel `ArrayBuffer` is transferred to the worker zero-copy and handed back with the result so the next request can reuse it. (The `DoubleBufferPool` class belongs to the optical scanner, `src/packages/optical-scanner/lib/bufferPool.ts`, and is not used by the scannability worker.) Alongside raw pixel data and canvas dimensions, the background worker contract (`src/packages/scannability/lib/sharedContract.ts`) validates physical matrix module layout configurations to execute localized QR-aligned relative luminance contrast audits across each module cell boundary with strictly typed runtime assertions. The worker runner maintains a 1500ms watchdog timer initiated immediately upon analysis requests, with self-healing fallback that recovers from worker timeouts or canvas extraction degradation by caching offscreen canvas degradation state and safely transferring `Uint8ClampedArray` buffers directly from main-thread canvas or extracting image data from `ImageBitmap` handles. The worker executes two-pass orientation and polarity analysis directly using pure JavaScript routines (`jsQR`), bypassing WebAssembly compilation and module instantiation overhead entirely. The adaptive scheduler dynamically throttles scan execution frequency when latency approaches 100ms, and cooperative yielding ensures stale scan requests are aborted immediately when new board updates occur. In environments where Web Workers are blocked or unsupported, a try-catch guarded initialization automatically falls back to synchronous main-thread processing (`scannabilityChecker.ts`), employing similar scheduling strategies (`requestIdleCallback` or `setTimeout`) to maintain a highly responsive UI without frame stutter.
- **Scannability Health Evaluator (Sealed Worker Seam)**: Callers ask one question and read one answer. `createScannabilityEvaluator` (`src/packages/scannability/lib/evaluator.ts`) takes a QR config plus a frame (pixels, an `ImageBitmap`, or the preview canvas) and publishes a single `ScannabilityAssessment` (`status`, `health`, `exportRisk`, `workerRecoveryActive`). Canvas capture, zero-copy buffer transfer, request sequencing (Superseded ACKs), backpressure, the worker lifecycle (spawned only through `createScannabilityWorker()`), the 1500ms watchdog, the Worker Degradation Cache and the main-thread fallback are private to it. The worker and the fallback both run one step-wise check (`scannabilitySteps` in `lib/checker.ts`), so contrast auditing, two-pass decoding, the `isDangerousUrl` security check and the optical simulation cannot drift apart; the worker only adds cooperative cancellation between steps. `destroy()` terminates an idle worker at once, but lets a worker with a frame in flight answer first (or run out the 1500ms watchdog window) before terminating it, because killing a worker while it draws a transferred `ImageBitmap` can crash WebKit's web process on hosts without GPU sync support. The worker factory, clock, frame reader and main-thread check are injected, so the evaluator is tested headlessly with fakes. `useScannability` in `client.ts` is a thin React adapter; app wiring (the `scannability-fail` store signal and the store module count) is injected by `src/hooks/useScannability.ts`, so the package never imports app layers.
- **Unified QR Decoding Worker and Frame Scaling**: We leverage a single, unified, off-thread background worker (`src/packages/optical-scanner/worker.ts`) to consolidate video demuxing, VP8/VP9 WebCodecs frame decoding, fallback standard/inverted scanning (`attemptBoth`), and bounding-box scaling (capped at 1280px). This background worker is shared between the file upload processor and webcam capture streams via cooperative event listening, and its spawning is private to the `optical-scanner` package. This ensures we maximize frame decoding efficiency, avoid multiple duplicate jsQR library allocations, prevent thread overhead, and maintain fluid rendering (above 58 FPS) on the main UI thread.
- **Camera Scanner Engine (Sealed Worker Seam)**: Live camera scanning runs through one headless engine (`createCameraScannerEngine` in `src/packages/optical-scanner/lib/cameraEngine.ts`) that owns the frame loop, adaptive sampling (16ms–1000ms, driven by the 5-frame median worker latency), non-blocking backpressure (one frame in flight), downscaling (1280px for the worker, 800px on the main thread), worker epochs, and the 1500ms starvation watchdog. A stalled or crashed worker is recreated up to three consecutive times with an exponentially backed-off watchdog budget (3000ms, then 6000ms); after the third failed restart, or when no worker can be spawned (for example under a strict CSP), the engine decodes on the main thread instead, without changing its public interface. The engine exposes only `start`, `stop`, `destroy`, `setOptions`, `getMetrics` and typed `subscribe` listeners (`onScanSuccess`, `onScanFail`, `onStatusChange`, `onMetricsChange`). The worker factory, clock and frame grabber are injected, so the engine is tested headlessly with fake frame sources, fake workers and a fake clock. The `useQrScanner` React hook is a thin adapter that creates the engine, batches its diagnostics into React state every 250ms and destroys it on unmount; it no longer exposes a `workerRef`.
- **Scanner Testing and Time-to-Decode Budgets**: The scanner is tested the way a user meets it. `tests/utils/fakeCamera.ts` replaces `getUserMedia` with a scripted canvas stream (`window.__cam`: a QR matrix or image, module size, noise, inversion, rotation and blur), which the scanner spec (`e2e/scanner.spec.ts`) and the file-transfer receiver spec share. The scanner spec measures time to decode in the page and holds PR CI to generous budgets (a code in view decodes in under 1 s); it also checks that no request goes out during a scan and that the camera is released. Decoder changes are judged with `pnpm run bench:scanner`, which runs every decoder strategy over the generated corpus in `tests/utils/scannerCorpus.ts` (module sizes, versions 1 to 25, error correction levels, inverted, rotated, perspective, blur, noise, glare and frames with no code) and prints the decode rate and p50 / p95 / max time per frame; `--ref <ref>` compares the decoder at other commits. Timing depends on the machine, so the benchmark runs on demand and in the nightly or manual **Scanner Benchmark** workflow, never as a PR gate.
- **Client-Side SVG Export**: We developed a custom `SvgContext` that mimics the Canvas 2D API to generate high-quality, resolution-independent vector graphics locally. The entire SVG file is generated in the browser without server-side rendering or image conversion APIs.

## Usage Calculations

### A. Network Payload & Bandwidth

CI enforces a **720 KB gzipped** limit on the total size of every file in `dist/client` (`scripts/check-bundle-size.js`, run after `pnpm build` in the CI build job; `pnpm build` itself does not check it). Because the total includes every pre-rendered HTML page, each new route raises it; the limit went from 700 KB to 720 KB on 2026-10-02 when the Bulk CSV page was added.

- **Average Bundle Size (Estimated):** ~500 KB (gzipped)
- **Worst Case Bundle Size:** 720 KB gzipped (the CI limit)

**Scenario: 10,000 Daily Users**
$$ 10,000 \text{ users} \times 0.5 \text{ MB} = 5,000 \text{ MB} = 5 \text{ GB / day} $$

**Scenario: 1,000,000 Daily Users**
$$ 1,000,000 \text{ users} \times 0.5 \text{ MB} = 500,000 \text{ MB} = 500 \text{ GB / day} $$

_Status:_ Cloudflare absorbs this bandwidth cost completely on the CDN layer.

### B. Compute Power

- **QR Creation:** Executed on the user's client hardware (~50ms CPU time per render). For 1 million users, 100% of compute load is distributed across 1 million client CPUs, resulting in **0ms server CPU overhead**.

### C. Operational Constraints (Builds)

The primary build deployment limit:

- **Limit:** 500 Builds / Month
- **Daily Average:** ~16 Builds / Day

$$ \frac{500 \text{ builds}}{30 \text{ days}} \approx 16.6 \text{ builds/day} $$

_Mitigation:_ This affects developer deploy frequency, not end-user capacity. If exceeded, new code deployments are paused until the next billing cycle, while existing static assets remain fully operational.

## Conclusion

QRCraftly runs all computation in the browser and serves only static files, so capacity grows with the number of visitors' devices rather than with server resources. The only shared limit is the number of builds per month.

**Recommendation:** Maintain the current Cloudflare Workers Static Assets hosting. No paid tier is needed for end-user capacity.
