---
status: accepted
superseded_in_part_by: 0020
---

# Cloudflare Workers Static Assets and Edge Branch Routing

> The branch model and release mechanics described here were replaced by [ADR 0020](./0020-trunk-based-releases-on-main.md): `main` is the only branch. See [RELEASING.md](../../RELEASING.md) for the current process.

## Context

Historically, QRCraftly's CI scripts attempted to execute `wrangler pages deploy` targeting a Cloudflare Pages project. However, the active deployment runtime and live endpoints run on Cloudflare Workers (`*.workers.dev`), resulting in CI failures due to the absence of a Pages project. Furthermore, Cloudflare has unified Pages into Workers with Static Assets, making Workers the modern deployment standard for full-stack applications with static frontends.

Additionally, we must ensure complete domain and branch isolation between preview staging (`dev`) and production (`main`) to guarantee that development builds never overwrite production.

## Decision

We standardize QRCraftly's edge architecture on **Cloudflare Workers with Static Assets** coupled with Cloudflare's **Wildcard Branch Routing**:

1. **Workers with Static Assets (`wrangler.jsonc`)**:
   - The deployment manifest `wrangler.jsonc` configures static asset delivery via `"assets": { "directory": "dist/client" }`.
   - All build outputs in `dist/client` (pre-rendered Vike SSG pages, static assets, service worker, and CSP headers) are served directly by Cloudflare's edge asset pipeline.
   - Shared edge resources (Cloudflare D1 database `qrcraftly-db` and KV caching namespaces) are bound directly within `wrangler.jsonc`.

2. **Native Edge Branch Routing**:
   - **Production (`main` branch)**: Routes to `https://qrcraftly.fpderuiter.workers.dev/` (and production custom domains like `qrcraftly.com`).
   - **Preview Staging (`dev` branch)**: Routes to `https://dev-qrcraftly.fpderuiter.workers.dev/` with automatic `X-Robots-Tag: noindex` protection.
   - **Pull Requests**: Provisioned as ephemeral branch previews matching `https://<branch>-qrcraftly.fpderuiter.workers.dev/`.
   - Domain routing is handled at Cloudflare's edge based on Git branch lineage, making branch collision or production overwrite impossible.

3. **Retirement of Broken CLI Deployment Scripts**:
   - Decommissioned obsolete `wrangler pages deploy` calls in CI workflows and shell scripts.
   - GitHub Actions focuses strictly on quality gatekeeping (linting, tests, security audits, build quotas) rather than managing fragile CLI deployment credentials.

## Rationale

Cloudflare Workers with Static Assets provides first-class performance and eliminates the distinction between Pages and Workers. Utilizing Cloudflare's native wildcard branch routing guarantees absolute separation between staging and production without manual environment juggling or risk of overwriting production.

## Consequences

- `wrangler.jsonc` specifies `"assets": { "directory": "dist/client", "binding": "ASSETS" }`.
- The preview staging URL is canonically documented as `https://dev-qrcraftly.fpderuiter.workers.dev/`.
- The production URL is canonically documented as `https://qrcraftly.fpderuiter.workers.dev/` and `https://qrcraftly.com`.
- Redundant and failing `wrangler pages deploy` shell scripts are retired from the repository.

## Addendum: Dynamic Redirect Worker Entry (#928, #973)

- The Pages Functions directory (`functions/`) never ran on Workers Static Assets and has been removed. The dynamic redirect API now lives in the deep module `src/packages/edge-redirect/`, whose `worker.ts` is the Worker entry (`main`) and falls through to the `ASSETS` binding for everything it does not handle.
- KV is dropped: redirects are stored only in D1, rate limiting uses the Cloudflare Rate Limiting binding, and destinations are never cached, so the free tier covers the feature and updates are visible on the next scan.
- The entry is not yet wired into `wrangler.jsonc` (no `main`, placeholder D1 `database_id`). The enablement checklist is in `docs/public/EDGE_ARCHITECTURE.md`.
