---
status: accepted
---

# Husky and Lint-Staged Git Guardrails

## Context

To prevent broken builds, formatting regressions, and unformatted code from entering the repository, git hooks run pre-commit checks. Previously, `simple-git-hooks` was used alongside npm scripts. However, modern multi-agent development workflows and distributed contributors require robust hook lifecycle management, precise staging-aware formatting via `lint-staged`, and reliable cross-platform execution on Windows, macOS, and Linux without shell divergence.

## Decision

We standardize on **Husky v9** combined with **lint-staged** for client-side pre-commit validation:

1. **Standardized Hook Orchestration**: Husky v9 manages `.husky/pre-commit` as a lightweight shell entry point executed automatically by Git.
2. **Staged Formatting Gate**: `lint-staged` runs Prettier across staged TypeScript, JavaScript, JSON, CSS, and Markdown files before commit finalization.
3. **Repository Definition**: `.lintstagedrc` defines the staged file patterns and formatting tasks, and `package.json` configures `"prepare": "husky"`.

## Rationale

Husky is the industry-standard hook manager with zero-overhead POSIX script execution across all major operating systems. Paired with `lint-staged`, it ensures that formatting invariants are enforced on changed files prior to commit creation, eliminating formatting-only CI failures.

## Consequences

- Commits automatically format staged assets prior to commit creation.
- Tooling is documented in `CONTEXT.md` under `Git Guardrails`.
- Automated tests and CI pipelines continue to verify repository-wide format compliance via `prettier --check .` and `pnpm run lint`.
