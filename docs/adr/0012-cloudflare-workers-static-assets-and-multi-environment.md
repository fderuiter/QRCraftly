---
status: accepted
---

# Cloudflare Workers Static Assets and Multi-Environment Architecture

## Context

Historically, QRCraftly's CI deployment scripts attempted to execute `wrangler pages deploy` targeting a Cloudflare Pages project. However, the active deployment runtime and live preview endpoint (`https://qrcraftly.fpderuiter.workers.dev/`) run on Cloudflare Workers, causing CI pipeline failures due to the absence of a Pages-managed project. Furthermore, Cloudflare has unified Pages into Workers with Static Assets, making Workers the modern, first-class deployment model for full-stack edge applications with static frontends.

Additionally, deployment needs to strictly isolate staging verification (the `dev` branch deploying to `qrcraftly.fpderuiter.workers.dev`) from production releases (the `main` branch serving custom production domains like `qrcraftly.com`).

## Decision

We migrate QRCraftly's edge runtime and deployment tooling to **Cloudflare Workers with Static Assets** and declare distinct deployment environments within `wrangler.jsonc`:

1. **Workers with Static Assets**:
   - The deployment manifest `wrangler.jsonc` configures static asset serving via `"assets": { "directory": "dist/client", "binding": "ASSETS" }`.
   - The build output in `dist/client` (including pre-rendered Vike SSG pages, hashed client assets, service worker, and security headers) is served directly via Cloudflare's edge asset pipeline.

2. **Multi-Environment Declaration in `wrangler.jsonc`**:
   - **Default/Staging Environment**: Targets the worker deployment serving `qrcraftly.fpderuiter.workers.dev`, utilized by automated CI runs on the `dev` branch.
   - **Production Environment (`[env.production]`)**: Targets the production domain (`qrcraftly.com`), executed exclusively when releases are promoted to `main`.
   - Shared edge resources (Cloudflare D1 SQL database `qrcraftly-db` and KV caching namespaces) are bound systematically per environment.

3. **CI Pipeline Migration**:
   - Replaced all invocations of `wrangler pages deploy` in CI shell scripts (`deploy_dev.sh`, `deploy_production.sh`, `deploy_preview.sh`) with `wrangler deploy`.

## Rationale

Migrating to Workers with Static Assets standardizes our infrastructure on Cloudflare's current platform architecture. Leveraging Wrangler's multi-environment declarations within a single `wrangler.jsonc` eliminates project duplication in the Cloudflare dashboard while maintaining an airtight boundary between staging and production.

## Consequences

- CI scripts invoke `pnpm exec wrangler deploy` instead of Pages deployment subcommands.
- `wrangler.jsonc` serves as the single source of truth for edge asset routing, D1 bindings, and environment overrides.
- Automated smoke tests validate edge deployments against `qrcraftly.fpderuiter.workers.dev` on `dev` commits prior to production promotion.
