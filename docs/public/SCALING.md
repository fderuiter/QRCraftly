---
publish-approved: true
---

# Scalability Analysis & Capacity Planning

## Executive Summary

**Projected Capacity:** Effectively Unlimited Daily Users
**Bottleneck:** Deployment frequency (Builds/month), not Traffic.

_Streamlined and secured QR code file transfer capability._

QRCraftly is architected as a **Static Site (SSG)** with **Client-Side Processing**. This architecture decouples user volume from server-side resource consumption. Hosted on Cloudflare Pages (Free Tier), the application leverages Cloudflare's global CDN for asset delivery while offloading all computational logic (QR code generation, image processing) to the user's device.

## Architecture & Resource Usage

### 1. Architecture: Static Site Generation (SSG)

- **Framework:** Vike (Vite + React)
- **Rendering:** Pre-rendered to static HTML/CSS/JS at build time (`prerender: true`).
- **Logic:** 100% Client-Side. The `qrcode` generation and Canvas rendering happen in the user's browser.
- **Server Load:** 0%. There is no Node.js server, database, or API running at runtime.

### 2. Hosting: Cloudflare Pages (Free Tier)

Cloudflare Pages treats this application as static assets. The limits for the Free Tier are applied as follows:

| Resource             | Free Tier Limit | QRCraftly Usage     | Impact                     |
| :------------------- | :-------------- | :------------------ | :------------------------- |
| **Static Requests**  | Unlimited       | ~10-15 per session  | **None**                   |
| **Bandwidth**        | Unlimited       | ~500KB per session  | **None**                   |
| **Server Functions** | 100,000 / day   | 0 (None used)       | **None**                   |
| **Concurrent Users** | Unlimited       | Client-side handled | **None**                   |
| **Builds**           | 500 / month     | 1 per deploy        | **Operational Constraint** |

### 3. Client-Side Performance Optimizations

To ensure high performance without server-side compute, QRCraftly relies on advanced browser APIs:

- **Scannability Web Workers & Main-Thread Fallback**: We utilize Web Workers (`scannabilityWorker.ts`) to perform real-time QR code scannability testing on a background thread. To completely eliminate main-thread rendering lag during interactive brush strokes and arcade gameplay loops ("Destroy the QR"), the canvas state is captured asynchronously as a lightweight `ImageBitmap` handle and transferred to the worker via zero-copy Transferable Objects, preventing memory neutering and re-allocation loops from directly transferring raw arrays. Secondary scannability passes use dedicated `onlyInvert` inversion attempts after `dontInvert` scans to avoid redundant standard decoding passes. The background worker utilizes a single cached instance of `OffscreenCanvas` and its 2D rendering context to extract and process pixel data off-thread, entirely bypassing synchronous pixel extraction on the main rendering thread. When the experimental native main-thread detector is active, the system safely falls back to synchronous pixel extraction to prevent regression risks. To reduce garbage collection overhead and memory churn, the worker also reuses statically pre-allocated `Uint8ClampedArray` destination and temporary buffers during continuous evaluation loops. To prevent background processing backlog, the pipeline features a backpressure guard that drops frames on the main thread when the worker is busy and evaluation latency exceeds the frame interval. Furthermore, the worker dynamically aborts obsolete tasks at multiple yield points if a newer canvas frame has been submitted. In environments where Web Workers are blocked or unsupported, a try-catch guarded initialization automatically falls back to synchronous main-thread processing (`scannabilityChecker.ts`), employing similar scheduling strategies (`requestIdleCallback` or `setTimeout`) to maintain a highly responsive, scrollable UI under 200ms lag.
- **Unified QR Decoding Worker and Frame Scaling**: We leverage a single, unified, off-thread background worker (`scannerWorker.ts`) to consolidate video demuxing, VP8/VP9 WebCodecs frame decoding, fallback standard/inverted scanning (`onlyInvert`), and bounding-box scaling (capped at 1280px). This background worker is dynamically shared across components and hooks (like the file upload processor and webcam capture streams) via cooperative event listening. This ensures we maximize frame decoding efficiency, avoid multiple duplicate jsQR library allocations, prevent thread overhead, and maintain fluid rendering (above 58 FPS) on the main UI thread.
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

_Status:_ Cloudflare absorbs this bandwidth cost completely on the Free Tier.

### B. Compute Power (QR Generation)

Because the "heavy lifting" (generating the QR matrix and rendering the canvas) happens on the client:

- **1 User:** Uses ~50ms of their own CPU.
- **1 Million Users:** Uses ~50ms of _their own_ CPU each.
- **Server CPU Load:** 0ms total.

### C. Operational Constraints (Builds)

The primary limit is the number of times you can deploy updates.

- **Limit:** 500 Builds / Month
- **Daily Average:** ~16 Builds / Day

$$ \frac{500 \text{ builds}}{30 \text{ days}} \approx 16.6 \text{ builds/day} $$

_Mitigation:_ This affects developer velocity, not end-user capacity. If you exceed this, you cannot deploy new code until the next month, but the site remains online and fully functional for users.

## Conclusion

The application's scalability is constrained only by Cloudflare's global infrastructure capacity, which is massive. The Free Tier effectively supports **millions of daily active users** because the hosting provider bills/limits based on server-side compute (Functions) and storage, neither of which QRCraftly utilizes for its core runtime loop.

**Recommendation:** Continue with the current Free Tier hosting. It is sufficient for any foreseeable traffic spike (e.g., viral social media traffic) without incurring costs.
