---
status: accepted
---

# Authoritative Deployment Orchestration and Branch Strategy

## Context

Previously, deployment to Cloudflare was split between Cloudflare's native GitHub App (triggering automatic builds on pushes to `main`) and GitHub Actions workflows (`main.yml`, `deploy.yml`, `preview.yml`). This created duplication, potential race conditions, and divergent build outputs. Furthermore, Cloudflare's native builder bypassed repository-specific security and integrity verification steps, including:

- Client-side storage privacy AST auditing (`scripts/storage_privacy_ast_auditor.js`)
- Content Security Policy inline script hash injection (`scripts/csp_hash_injector.js`)
- Client-side service worker generation (`scripts/generate_sw.cjs`)
- Resource quota and bundle size boundary verification (`scripts/check-bundle-size.js`)
- SLSA Level 3 build provenance attestations (`actions/attest-build-provenance`)
- Automated Playwright end-to-end and Vitest unit testing suites

Additionally, external contributors and autonomous AI agents frequently default to creating forks and branches from the repository's default branch. With `main` historically serving as both the production release branch and the default Git branch, unvetted work could inadvertently target production.

## Decision

We establish **GitHub Actions as the single Authoritative Deployment Orchestrator** and transition to a **Two-Tier Staged Promotion Branch Strategy**:

1. **GitHub Actions as Authoritative Deployment Orchestrator**:
   - Cloudflare native Git auto-builds are disabled.
   - GitHub Actions is the sole system authorized to deploy artifacts to Cloudflare Workers via `wrangler deploy`.
   - All deployments must pass static validation, linting, unit tests, Playwright e2e tests, postbuild security injectors, and provenance attestations.

2. **Branch Topology (`dev` as Default Integration Branch)**:
   - `dev` is designated as the repository's default branch. All feature branches, bug fixes, refactors, and AI agent contributions branch from and target `dev`.
   - Merging into `dev` automatically triggers deployment to the shared preview staging environment at `https://qrcraftly.fpderuiter.workers.dev/`.
   - `main` is reserved strictly for production releases (`https://qrcraftly.com`). Code reaches `main` solely via promotional pull requests from `dev` into `main` (or emergency rollback workflows).

3. **Cloudflare Runtime Target**:
   - The deployment target is standardized on **Cloudflare Workers with Static Assets** (`wrangler deploy`) matching the live endpoint `qrcraftly.fpderuiter.workers.dev`.
   - Obsolete `wrangler pages deploy` commands targeting nonexistent Pages projects are eliminated.

4. **Ephemeral PR Preview Deployments**:
   - Pull requests targeting `dev` generate isolated preview environments, running Playwright smoke tests before changes are merged into the shared `dev` branch.

## Rationale

Decoupling Cloudflare's build app in favor of GitHub Actions ensures strict compliance with QRCraftly's zero-knowledge security and privacy invariants. No code reaches edge networks without passing the pre-build AST storage auditor and post-build CSP hash injection.

Designating `dev` as the default branch isolates ongoing developer and agent velocity from production, providing a continuous edge staging ground on `workers.dev` while protecting the stability of `main`.

## Consequences

- Direct pushes to `main` are restricted to release promotions and rollbacks.
- PR workflows (`main.yml` and `preview.yml`) must listen to pull requests targeting `dev` as well as `main`.
- Cloudflare deployment secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are managed securely within GitHub Actions repository secrets.
- CI deployment scripts (`deploy_dev.sh`, `deploy_production.sh`, `deploy_preview.sh`) are updated from `wrangler pages deploy` to `wrangler deploy`.
