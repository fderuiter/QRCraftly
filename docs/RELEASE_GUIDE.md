# Release Guide & Lifecycle Runbook

This guide explains how releases work in QRCraftly, the architectural rationale behind our **Fast-Forward Promotion Model**, and the exact step-by-step instructions for cutting production releases.

---

## 1. Architectural Overview & Core Principles

QRCraftly employs a **Two-Tier Staged Promotion Model** designed for client-side cryptographic safety, edge domain isolation, and deterministic Git lineage:

```
[ feat/*, fix/*, agent/* ]  ──(PR)──>  [ dev ] (Integration Trunk)
                                         │
                                         ▼ (Auto-build via Cloudflare)
                                       Staging: dev-qrcraftly.fpderuiter.workers.dev
                                         │
                                         ▼ (Fast-Forward Promotion: --ff-only)
                                       [ main ] (Production Trunk)
                                         │
                                         ├──> Auto-build via Cloudflare (qrcraftly.com)
                                         └──> GitHub Actions: Tag + Release Notes + Smoke Tests
```

### Key Invariants

1. **`dev` is the Single Integration Source of Truth**:
   - All features, fixes, and dependencies merge into `dev` via Pull Requests.
   - Commits pushed to `dev` automatically deploy to the **Preview Staging Environment** (`https://dev-qrcraftly.fpderuiter.workers.dev`) via Cloudflare Workers Builds.
   - Changes are verified on staging before production promotion.

2. **`main` is Advanced Exclusively by Fast-Forward Promotion**:
   - **NEVER** open a GitHub Pull Request from `dev` to `main`. GitHub PR merges (including "Rebase and merge" and "Squash and merge") rewrite commit SHAs on `main`.
   - Rewriting commit SHAs causes `dev` and `main` to permanently diverge, breaking lineage auditors and creating duplicate commit histories.
   - Promotion to `main` is performed using `git push origin dev:main --ff-only`. This ensures that `main` and `dev` point to the **exact same commit SHA** with zero history divergence.

3. **Conventional Commits & Automated SemVer 2.0.0**:
   - Releases are governed by Conventional Commit prefixes:
     - `feat:` or `feat(scope):` $\rightarrow$ **Minor bump** (`0.X.0`)
     - `fix:`, `perf:`, `refactor:`, `docs:`, `chore:` $\rightarrow$ **Patch bump** (`0.0.X`)
     - `BREAKING CHANGE:` or `feat!:` / `fix!:` $\rightarrow$ **Major bump** (`X.0.0`)
   - `scripts/release_engine.js` automatically inspects commits between the latest Git tag and HEAD to calculate the version and format changelog entries.

4. **Edge Isolation (Cloudflare Workers Builds)**:
   - Cloudflare Workers Builds maps branches natively to edge subdomains:
     - `dev` $\rightarrow$ `https://dev-qrcraftly.fpderuiter.workers.dev` (`X-Robots-Tag: noindex`)
     - `main` $\rightarrow$ `https://qrcraftly.fpderuiter.workers.dev` and `https://qrcraftly.com`
   - It is physically impossible for code on `dev` to overwrite production without promoting to `main`.

---

## 2. Release Tooling Reference

| Tool / Script                   | Purpose                                                                                                                                                    | When to Run                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm run release:dry-run`      | Inspects commits since latest tag, calculates SemVer bump, and previews formatted changelog without making changes.                                        | Always run first to preview the upcoming release.                    |
| `pnpm run release:changelog`    | Updates `version` in `package.json` and prepends the release section to `CHANGELOG.md`.                                                                    | When preparing release notes or verifying changes before promotion.  |
| `pnpm run release:promote`      | Executes full promotion: updates changelog + version, commits, pushes `dev`, fast-forwards `main` (`--ff-only`), and pushes Git tag.                       | When ready to cut a production release from `dev`.                   |
| `.github/workflows/release.yml` | GitHub Actions workflow: extracts changelog notes, creates official GitHub Release (`gh release create`), and runs post-deployment production smoke tests. | Triggers automatically on push to `main` (or via workflow dispatch). |

---

## 3. Step-by-Step Instructions: Cutting a Release

### Standard Flow: One-Command Promotion (Recommended)

This is the standard, automated method for project maintainers and autonomous agents.

#### Step 1: Ensure `dev` is Clean and Up to Date

```bash
git checkout dev
git pull origin dev
```

Verify that all unit tests and static validation checks pass locally:

```bash
pnpm run lint
pnpm test run
```

#### Step 2: Preview the Release (Dry Run)

```bash
pnpm run release:dry-run
```

Inspect the output in your terminal:

- Verify the **Bump type** (`patch`, `minor`, `major`).
- Verify the **Next version** (e.g. `v0.8.0`).
- Review the grouped changelog (Features, Bug Fixes, Maintenance).

#### Step 3: Promote to Production

```bash
pnpm run release:promote
```

This command automatically and atomically:

1. Updates `"version"` in `package.json`.
2. Prepends the formatted release notes to `CHANGELOG.md`.
3. Commits the release: `chore(release): vX.Y.Z`.
4. Pushes `dev` to `origin dev`.
5. Fast-forward pushes `dev` to `origin main` (`git push origin dev:main --ff-only`).
6. Creates an annotated Git tag `vX.Y.Z` and pushes it to `origin`.

#### Step 4: Verify Automated Post-Promotion Pipeline

Once `main` is updated:

1. **Edge Deployment**: Cloudflare Workers Builds automatically builds `main` and deploys to `https://qrcraftly.com`.
2. **GitHub Actions**: `.github/workflows/release.yml` runs automatically:
   - Publishes the official **GitHub Release** with markdown release notes.
   - Executes Playwright smoke tests against `https://qrcraftly.fpderuiter.workers.dev` and `https://qrcraftly.com`.

---

### Alternative Flow: Two-Step Review (Changelog PR)

If team policy requires a formal pull request to review release notes before cutting a release:

1. **Generate Changelog on a release branch**:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b chore/prepare-release-v0.8.0
   pnpm run release:changelog
   git add CHANGELOG.md package.json
   git commit -m "chore(release): v0.8.0"
   git push origin chore/prepare-release-v0.8.0
   ```
2. **Open PR targeting `dev`** (e.g. `chore: release v0.8.0`).
3. **Merge PR into `dev`** once approved and CI passes.
4. **Fast-forward promote to `main`**:
   ```bash
   git checkout dev
   git pull origin dev
   pnpm run release:promote
   ```
   _Note: `release:promote` detects that `package.json` and `CHANGELOG.md` are already updated and will skip duplicate changelog insertion, proceeding directly to fast-forward and tagging._

---

### Browser Flow: Promotion via GitHub Actions UI

If maintainers need to trigger promotion directly from the GitHub web interface:

1. Navigate to **Actions** $\rightarrow$ **Release** workflow.
2. Click **Run workflow**.
3. Select **Branch: dev**.
4. In the inputs, select `promote_from_dev`.
5. The workflow executes `node scripts/release_engine.js --promote` using the bot's credentials, fast-forwards `main`, and triggers the production release pipeline.

---

## 4. Emergency Rollback Procedure

If a critical bug reaches production:

1. **Identify the Good Commit**:
   ```bash
   git log --oneline -n 5 origin/main
   ```
2. **Revert on `main`**:

   ```bash
   git checkout main
   git pull origin main
   git revert <bad-commit-sha>
   git push origin main
   ```

   _Note: Pushing a commit starting with `Revert` triggers the emergency rollback job in `.github/workflows/main.yml`, bypassing normal release steps and deploying the reverted state immediately._

3. **Backport Revert to `dev`**:
   Keep staging synchronized with production:
   ```bash
   git checkout dev
   git pull origin dev
   git merge origin/main --ff-only || git merge origin/main -m "chore(rollback): sync revert from main"
   git push origin dev
   ```

---

## 5. Troubleshooting & FAQ

### Q: Why did `git push origin dev:main --ff-only` fail with "non-fast-forward"?

**Cause**: Someone committed directly to `main`, or an emergency hotfix was applied to `main` and has not yet been merged back into `dev`.  
**Resolution**:

1. Check what commit is on `main` that `dev` is missing:
   ```bash
   git log dev..origin/main --oneline
   ```
2. Merge or rebase that commit into `dev`:
   ```bash
   git checkout dev
   git merge origin/main
   git push origin dev
   ```
3. Retry `pnpm run release:promote`.

### Q: Why was `required_linear_history` removed from `.github/rulesets/main.json`?

GitHub's `required_linear_history` rule does not allow fast-forward pushes from non-PR workflows and forces developers to use GitHub's "Rebase and merge" button on PRs. "Rebase and merge" creates new commit SHAs on `main`, causing permanent divergence from `dev`. We enforce linear history **architecturally** through `--ff-only` promotion instead of via GitHub's restrictive ruleset.

### Q: What should I do if a Git tag was created with an incorrect version?

Delete the local and remote tag, then re-run `release:promote`:

```bash
git tag -d vX.Y.Z
git push origin --delete vX.Y.Z
```
