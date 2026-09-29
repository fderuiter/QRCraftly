---
status: accepted
---

# Release PRs, Tag-Driven Publishing, and Cloudflare-Owned Deploys

## Context

ADR 0015 introduced fast-forward promotion from `dev` to `main` and a release engine. ADR 0011 and ADR 0012 made Cloudflare Workers Builds responsible for deploys. By September 2026 the workflows no longer matched those decisions (issues #988 and #989):

- `deploy.yml` and the "rollback" job in `main.yml` deployed nothing. `deploy_production.sh` only echoed a URL. The job then committed a release manifest straight to the branch, which breaks the next fast-forward promotion.
- `preview.yml` ran under `pull_request_target`, checked out PR code with write permissions, and smoke tested shared staging rather than the PR. Its decommission job could never run.
- `release.yml` promoted from a `workflow_dispatch` job that pushed with `GITHUB_TOKEN`. The `main` ruleset blocks that push, and pushes made with `GITHUB_TOKEN` don't trigger other workflows, so the tag and release jobs never ran. Its `bump` input was ignored.
- `release:promote` committed the version bump and pushed `dev` directly, so the release commit was never reviewed or checked by CI.
- The `main` ruleset required status checks that no job produced, and `dev`, the branch every PR targets, had no ruleset.
- The release engine split `git log` output on newlines, so multi-line commit bodies became bogus changelog entries and `BREAKING CHANGE:` footers were missed. New releases were inserted above `## [Unreleased]`.

## Decision

1. **Cloudflare Workers Builds owns every deploy.** `main` deploys to production. Every other branch, including `dev` and PR branches, uploads a preview version with a branch URL. GitHub Actions holds no Cloudflare credentials. `deploy.yml`, `preview.yml` and their scripts are deleted.
2. **`dev` accepts changes only through pull requests.** PRs are squash-merged, so the PR title becomes the commit subject. A `PR Title` check enforces Conventional Commits. A single aggregate `CI` job in `main.yml` is the required check, so renaming jobs never strands a ruleset.
3. **Version bumps go through a release PR.** `pnpm run release:prepare` creates `release/vX.Y.Z` with the `package.json` version and the `CHANGELOG.md` section. It is reviewed and merged into `dev` like any other change.
4. **Promotion is a local, admin-only, atomic fast-forward plus tag.** `pnpm run release:promote` checks that `dev` is clean and current, the changelog has the version, the tag is new, and `main` can fast-forward. It then runs `git push --atomic origin HEAD:refs/heads/main refs/tags/vX.Y.Z`. It never commits and never pushes `dev`. ADR 0015's rule stands: never merge a PR from `dev` into `main`.
5. **Publishing is driven by the tag.** `release.yml` runs on `v*.*.*` tag pushes. It never pushes to a branch. It verifies the tag (annotated, matches `package.json`, on `main`), publishes the GitHub Release from the changelog section, waits until production serves the new `/version.json`, and smoke tests both production URLs.
6. **Rollback is a Cloudflare version rollback, then fix forward.** Operators roll back in the Cloudflare dashboard or with `wrangler rollback`, then land a fix or revert on `dev` and cut a patch release. Nobody pushes to `main` except `release:promote`.
7. **Rulesets live in `.github/rulesets/`** as `dev.json`, `main.json` and `tags.json`. Admins apply them by importing them in the repository settings.

## Consequences

- Every commit on `main` is a commit that already passed CI on `dev`, and `main` never has commits that `dev` lacks.
- Releases need a repository admin with a local clone. There is no browser-only release path.
- There is no hotfix branch. An urgent fix reaches production through `dev`, with a Cloudflare rollback covering the gap.
- Each deployed environment reports its version and commit at `/version.json`, written by `scripts/write_build_info.js`.
- This supersedes the promotion, rollback and `release.yml` sections of ADR 0015, the "promotional pull request" wording in ADR 0011 and ADR 0013, and the preview-workflow parts of ADR 0012.
