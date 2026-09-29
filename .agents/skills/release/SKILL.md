---
name: release
description: "Production release lifecycle: SemVer calculation, release PRs, and fast-forward promotion with tags."
license: MIT
metadata:
  author: QRCraftly
  version: "2.0"
---

# Release Skill

Use this skill when preparing, previewing, or executing a production release, or when asked to promote changes from `dev` to `main`. The full runbook is `RELEASING.md`; the decision record is ADR 0018.

## Non-Negotiable Invariants
1. **Never PR from `dev` to `main`, and never push to `main` directly.** `main` only moves through `pnpm run release:promote`, which fast-forwards it and pushes the tag atomically.
2. **Never push to `dev` directly.** The version bump and changelog go through a release PR, like any other change.
3. **GitHub Actions never deploys.** Cloudflare Workers Builds deploys `main` to production and every other branch to a preview URL.
4. **Conventional Commits**: PR titles are the squashed commit subjects that decide the SemVer bump (`feat:` -> minor, others -> patch, `!` or `BREAKING CHANGE:` -> major).

## Quick Reference

```bash
git checkout dev && git pull --ff-only origin dev
pnpm run release:dry-run                 # preview version and changelog
pnpm run release:prepare                 # creates release/vX.Y.Z with the bump commit
git push -u origin release/vX.Y.Z        # open a PR into dev titled chore(release): vX.Y.Z, squash-merge when CI passes
git checkout dev && git pull --ff-only origin dev
pnpm run release:promote                 # maintainers only: fast-forward main + push tag vX.Y.Z
```

The tag push starts `.github/workflows/release.yml`, which verifies the tag, publishes the GitHub Release, waits for production to serve `/version.json` for the new version, and smoke tests production.

## Agents

Agents may run `release:dry-run` and `release:prepare` and open the release PR. `release:promote` needs a repository admin and explicit maintainer approval; ask for it rather than running it.

## Rollback

Roll back the deployment in Cloudflare (dashboard or `wrangler rollback`), then fix forward on `dev` and cut a patch release. Never revert on `main`.
