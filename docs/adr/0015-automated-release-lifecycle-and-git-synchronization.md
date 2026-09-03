---
status: accepted
---

# Automated Release Lifecycle and Git Lineage Synchronization

## Context

The repository experienced a persistent split-brain condition between the `dev` and `main` branches.
The root cause was the combination of two policies:

1. `"type": "required_linear_history"` in `.github/rulesets/main.json` forces GitHub to use
   "Rebase and merge" when a promotional PR from `dev` is merged into `main`.
2. Rebase rewrites every commit SHA on `main`. This guarantees that `dev` and `main` immediately
   diverge after every release promotion, making `git diff origin/main...HEAD` compare against
   a stale common ancestor and auditing tools audit the entire repository history on every PR.

Additional deficiencies contributed to the divergence:

- `package.json` version was frozen at `"0.0.0"` since the initial commit.
- Tags used a non-standard 4-digit scheme (`v0.7.0.0` through `v0.7.0.3`) instead of SemVer 2.0.0.
- No automated changelog generation existed; release notes were manually composed.
- The `deploy.yml` workflow committed back to the branch during CI, creating a 5-retry rebase loop.

## Decision

### 1. Git Lineage Healing (One-Time)

Reset `origin/main` to the `dev` branch tip (`b88086f`) using `git push origin dev:main --force-with-lease`,
exercising the Repository Admin bypass (actor_id 5). The two branch tips shared 100% identical file
trees (confirmed by `git diff origin/main dev` producing zero output before the fountain codes ADR commit);
the force-push is a lineage repair, not a data loss event.

### 2. Fast-Forward Promotion Policy (Architectural Enforcement)

Remove `"type": "required_linear_history"` from `.github/rulesets/main.json`.
Replace GitHub-enforced rebase with **workflow-enforced fast-forward only** in `scripts/release_engine.js`
(`git push origin dev:main --ff-only`). This:

- Preserves exact commit SHAs from `dev` on `main`.
- Guarantees `git log main` and `git log dev` are always identical after promotion.
- Prevents the audit-tool false-positive where `git diff origin/main...HEAD` spans the entire history.

### 3. SemVer 2.0.0 Compliance

Adopt standard three-part SemVer (`MAJOR.MINOR.PATCH`) as the canonical versioning scheme.
The first SemVer-compliant release is **`v0.8.0`**, derived by:

- Treating `v0.7.0.3` (the last 4-digit tag) as `0.7.0`.
- Applying a minor bump for the two `feat:` commits since that tag.
  The release engine normalises any encountered 4-digit tag to 3-part SemVer.

### 4. Automated Release Engine (`scripts/release_engine.js`)

A cross-platform ESM Node.js utility that:

- Reads conventional commits between the latest git tag and HEAD.
- Computes the next SemVer bump (`feat:` → minor, `fix:` → patch, breaking → major).
- Generates a grouped Keep-a-Changelog markdown section.
- Supports three CLI modes: `--dry-run` (preview), `--generate-changelog` (write files), `--promote` (ff-push + tag).

### 5. `CHANGELOG.md` (Keep a Changelog Format)

A canonical `CHANGELOG.md` is established at the repository root, seeded with all releases from
`v0.6.0` through `v0.8.0`. The release engine prepends new sections on every release.

### 6. `release.yml` GitHub Actions Workflow

A dedicated workflow triggered on `push` to `main` (post-promotion) and `workflow_dispatch` that:

- Runs the release engine to compute the version and changelog.
- Creates an annotated Git tag.
- Creates an official GitHub Release with structured release notes.
- Runs production smoke tests against `https://qrcraftly.fpderuiter.workers.dev` and `https://qrcraftly.com`.

## Consequences

- `git log --graph --oneline dev main` always shows a single unified linear history after each promotion.
- `git diff main dev` is always empty immediately after a promotion.
- The `git_lineage_auditor.js` correctly computes changed files relative to the common ancestor.
- `package.json` version, `CHANGELOG.md`, and annotated Git tags are the three sources of truth for release state.
- The `deploy.yml` "Enterprise Deployment & Rollback" workflow is retained exclusively for emergency
  rollback scenarios (revert commits pushed to `main`). It no longer receives version bump inputs.
- Agents must use `pnpm run release:dry-run` to preview, `pnpm run release:changelog` to generate,
  and `pnpm run release:promote` to cut a release. Direct `git push origin main` is prohibited.
