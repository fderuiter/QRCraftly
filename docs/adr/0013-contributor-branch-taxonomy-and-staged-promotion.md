---
status: accepted
---

# Contributor Branch Taxonomy and Staged Promotion

## Context

With multiple autonomous AI coding agents and human contributors interacting with the repository, establishing standardized branch naming, target hierarchies, and quality gates is essential. In the past, branches and pull requests frequently targeted `main` directly. Because `main` maps to production, untested or incomplete work risked impacting live end users. Furthermore, autonomous agents that clone or fork the repository typically default to branching off the repository's default branch.

## Decision

We establish a **Two-Tier Staged Promotion Model** with an enforced **Semantic Branch Prefix Taxonomy**:

1. **Repository Branch Hierarchy**:
   - **`dev` (Default Integration Branch)**: The canonical branch for all active development. All feature branches, bug fixes, refactors, and external PRs branch from and target `dev`. Commits merged into `dev` automatically deploy to the live preview staging environment (`https://qrcraftly.fpderuiter.workers.dev/`).
   - **`main` (Production Release Branch)**: The protected production branch. Direct pushes are prohibited. Code moves to `main` exclusively via promotional pull requests originating from `dev` (or hotfix rollbacks). Commits merged into `main` trigger production releases to `https://qrcraftly.com` with SLSA provenance attestations and version manifests.

2. **Standardized Semantic Branch Prefixes**:
   All working branches must use one of the following prefixes:
   - `feat/<description>`: New user-facing capabilities or features
   - `fix/<description>`: Bug fixes and defect corrections
   - `docs/<description>`: Documentation, ADRs, or glossary updates
   - `refactor/<description>`: Structural code improvements preserving behavior
   - `chore/<description>`: Tooling, dependency updates, CI/CD tweaks
   - `agent/<description>`: Scoped task executions initiated by autonomous AI agents

3. **Dual-Branch Quality Gates**:
   - Both `dev` and `main` require all static validation gates (`pnpm run lint`), unit tests (`vitest`), and cross-browser e2e suites (`playwright`) to pass in CI before PR merges are permitted.
   - PRs targeting `dev` spin up ephemeral previews to run smoke tests before merge.

4. **Staged Promotion Lifecycle**:
   - When a batch of changes on `dev` is verified on `https://qrcraftly.fpderuiter.workers.dev/`, a promotional PR from `dev` into `main` is created (e.g. `release: vX.Y.Z`).
   - Merging the promotion PR executes the production release workflow.

## Rationale

Designating `dev` as the default branch ensures that automated agents and forks inherently build on and target staging rather than production. The semantic prefix taxonomy standardizes git history, simplifies automated changelog generation, and enables CI workflow routing.

## Consequences

- All contributor documentation and agent system instructions in `AGENTS.md` mandate branching from `dev`.
- GitHub Actions PR triggers are configured for `[main, dev]`.
- Direct pushes to `main` are blocked.
