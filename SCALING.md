# Scalability Analysis & Capacity Planning

## Executive Summary

**Projected Capacity:** Effectively Unlimited Daily Users
**Bottleneck:** Deployment frequency (Builds/month), not Traffic.

QRCraftly is architected as a **Static Site (SSG)** with **Client-Side Processing**. This architecture decouples user volume from server-side resource consumption. Hosted on Cloudflare Pages (Free Tier), the application leverages Cloudflare's global CDN for asset delivery while offloading all computational logic (QR code generation, image processing) to the user's device.

## Architecture & Resource Usage

### 1. Architecture: Static Site Generation (SSG)
- **Framework:** Vike (Vite + React)
- **Rendering:** Pre-rendered to static HTML/CSS/JS at build time (`prerender: true`).
- **Logic:** 100% Client-Side. The `qrcode` generation and Canvas rendering happen in the user's browser.
- **Server Load:** 0%. There is no Node.js server, database, or API running at runtime.

### 2. Hosting: Cloudflare Pages (Free Tier)
Cloudflare Pages treats this application as static assets. The limits for the Free Tier are applied as follows:

| Resource | Free Tier Limit | QRCraftly Usage | Impact |
| :--- | :--- | :--- | :--- |
| **Static Requests** | Unlimited | ~10-15 per session | **None** |
| **Bandwidth** | Unlimited | ~500KB per session | **None** |
| **Server Functions** | 100,000 / day | 0 (None used) | **None** |
| **Concurrent Users** | Unlimited | Client-side handled | **None** |
| **Builds** | 500 / month | 1 per deploy | **Operational Constraint** |

## Usage Calculations

### A. Network Payload & Bandwidth
The project enforces a strict **3MB** total payload limit via CI checks, though typical localized bundles are significantly smaller.

*   **Average Bundle Size (Estimated):** ~500 KB (gzipped)
*   **Worst Case Bundle Size:** 3 MB

**Scenario: 10,000 Daily Users**
$$ 10,000 \text{ users} \times 0.5 \text{ MB} = 5,000 \text{ MB} = 5 \text{ GB / day} $$

**Scenario: 1,000,000 Daily Users**
$$ 1,000,000 \text{ users} \times 0.5 \text{ MB} = 500,000 \text{ MB} = 500 \text{ GB / day} $$

*Status:* Cloudflare absorbs this bandwidth cost completely on the Free Tier.

### B. Compute Power (QR Generation)
Because the "heavy lifting" (generating the QR matrix and rendering the canvas) happens on the client:

*   **1 User:** Uses ~50ms of their own CPU.
*   **1 Million Users:** Uses ~50ms of *their own* CPU each.
*   **Server CPU Load:** 0ms total.

### C. Operational Constraints (Builds)
The primary limit is the number of times you can deploy updates.

*   **Limit:** 500 Builds / Month
*   **Daily Average:** ~16 Builds / Day

$$ \frac{500 \text{ builds}}{30 \text{ days}} \approx 16.6 \text{ builds/day} $$

*Mitigation:* This affects developer velocity, not end-user capacity. If you exceed this, you cannot deploy new code until the next month, but the site remains online and fully functional for users.

## Conclusion

The application's scalability is constrained only by Cloudflare's global infrastructure capacity, which is massive. The Free Tier effectively supports **millions of daily active users** because the hosting provider bills/limits based on server-side compute (Functions) and storage, neither of which QRCraftly utilizes for its core runtime loop.

**Recommendation:** Continue with the current Free Tier hosting. It is sufficient for any foreseeable traffic spike (e.g., viral social media traffic) without incurring costs.
