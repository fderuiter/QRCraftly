---
name: release
description: "Automated production release lifecycle, SemVer calculation, changelog generation, and fast-forward promotion."
license: MIT
metadata:
  author: QRCraftly
  version: "1.0"
---

# Release Skill

Use this skill when preparing, previewing, or executing a production release, or when asked to promote changes from `dev` to `main`.

## Non-Negotiable Invariants
1. **Never PR from `dev` to `main`**: GitHub PR merges rewrite commit SHAs on `main`, causing permanent history divergence from `dev`. Promotion is strictly fast-forward (`dev:main`).
2. **Never commit directly on `main` in CI**: Commits must originate on `dev` and be promoted.
3. **Conventional Commits**: Releases follow SemVer 2.0.0 derived from commit messages (`feat:` -> minor, `fix:`/`docs:`/`chore:` -> patch, `BREAKING CHANGE:` -> major).

## Release Flow: Quick Reference

### 1. Preview (Dry Run)
Before cutting a release, inspect what will be bumped:
```bash
git checkout dev
git pull origin dev
pnpm run release:dry-run
```

### 2. Promote to Production (CLI)
To cut the release, update changelog, fast-forward `main`, and tag:
```bash
pnpm run release:promote
```
This automatically:
- Updates `package.json` version.
- Prepends `CHANGELOG.md` with Keep-a-Changelog section.
- Commits `chore(release): vX.Y.Z`.
- Pushes `dev` to `origin dev`.
- Fast-forwards `main` via `git push origin dev:main`.
- Creates and pushes annotated tag `vX.Y.Z`.

### 3. Monitor Post-Release Pipeline
```bash
gh run list --workflow=release.yml --limit 1
gh run watch
gh release view
```

### 4. GitHub Actions Web UI Flow
If operating via the web interface:
1. Go to **Actions** -> **Release** workflow (`release.yml`).
2. Click **Run workflow** on branch **`dev`** (Bump: `auto`).
3. The workflow executes `--promote` on `dev`, pushes `dev:main`, creates the GitHub Release, and runs production smoke tests.