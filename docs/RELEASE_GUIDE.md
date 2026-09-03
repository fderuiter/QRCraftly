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

### Method 1: Comprehensive Release via CLI

This is the standard, atomic release procedure for maintainers and agents working in a local terminal or SSH environment.

#### Step 1: Pre-Flight Cleanliness & Staging Sync

Ensure your local clone is clean and on the latest `dev` branch:

```bash
git checkout dev
git pull origin dev
```

Run the test and static quality suite to ensure zero regressions:

```bash
pnpm run lint
pnpm test run
```

#### Step 2: Release Preview & Dry Run

Execute the release engine in `--dry-run` mode:

```bash
pnpm run release:dry-run
```

Inspect the output:

- **Latest tag**: The last released tag (e.g. `v0.7.0.3` or `v0.8.0`).
- **Current version**: The normalized SemVer baseline.
- **Bump type**: The computed version increment (`patch`, `minor`, or `major`) based on conventional commits.
- **Next version**: The target version about to be released (e.g. `v0.8.0`).
- **Changelog**: The formatted Keep-a-Changelog section showing categorized entries (`### Features`, `### Bug Fixes`, `### Maintenance`).

#### Step 3: Atomic Promotion & Tagging

Run the promotional engine:

```bash
pnpm run release:promote
```

This single command executes the following operations atomically:

1. Updates `"version"` in `package.json` to the target SemVer.
2. Prepends the formatted markdown section to `CHANGELOG.md`.
3. Commits the release changes: `chore(release): vX.Y.Z`.
4. Pushes `dev` to `origin dev`.
5. Fast-forward pushes `dev` into `main`: `git push origin dev:main --ff-only`.
6. Creates an annotated Git tag `vX.Y.Z` and pushes it to `origin`.

#### Step 4: Monitor Post-Promotion CI/CD via CLI

You can monitor the automated deployment and verification pipeline directly from the command line using the GitHub CLI (`gh`):

```bash
# Watch the release workflow run in real-time
gh run list --workflow=release.yml --limit 1
gh run watch

# Verify the official GitHub Release and release notes
gh release view
```

Cloudflare Workers Builds automatically detects the push to `main` and deploys to production. The GitHub Actions release workflow publishes the official GitHub Release and executes end-to-end smoke tests against both `https://qrcraftly.fpderuiter.workers.dev` and `https://qrcraftly.com`.

---

### Method 2: Comprehensive Release via GitHub Webpage UI

Maintainers can cut a release entirely from a web browser without needing a local terminal or SSH access.

#### Step 1: Verify Staging in Your Browser

Before promoting, navigate to the **Preview Staging Environment**:

- URL: `https://dev-qrcraftly.fpderuiter.workers.dev/`
- Confirm that recently merged features and fixes render as expected.

#### Step 2: Navigate to the Release Action in GitHub

1. Open the repository in your browser: `https://github.com/fderuiter/QRCraftly`
2. In the top navigation bar, click the **Actions** tab.
3. In the left-hand sidebar under **All workflows**, click **Release**.
   - Direct URL: `https://github.com/fderuiter/QRCraftly/actions/workflows/release.yml`

#### Step 3: Trigger the Promotional Workflow

1. Look for the blue banner at the top of the workflow list:  
   _"This workflow has a workflow_dispatch event trigger."_
2. Click the **Run workflow** dropdown button on the right.
3. In the modal:
   - **Use workflow from**: Select **Branch: dev**. _(Always trigger from `dev` because `dev` contains the code to promote)._
   - **SemVer bump type**: Keep `auto` (the engine will automatically deduce `patch`, `minor`, or `major` from conventional commits).
4. Click the green **Run workflow** button.

#### Step 4: Track the Automated Execution

After clicking **Run workflow**, refresh the page after a few seconds to see the new workflow run:

1. **Job 1: Fast-Forward Promote dev to main**:
   - Checks out `dev`.
   - Runs `scripts/release_engine.js --promote`.
   - Generates changelog and updates `package.json`.
   - Commits `chore(release): vX.Y.Z`.
   - Pushes `dev` and fast-forwards `main` (`--ff-only`) using the repository admin bypass.
2. **Job 2: Tag & Create GitHub Release** _(triggered by push to `main`)_:
   - Creates the annotated Git tag `vX.Y.Z`.
   - Publishes the official **GitHub Release** with markdown release notes.
3. **Job 3: Production Smoke Tests**:
   - Spins up Playwright in Chromium.
   - Executes live smoke tests against `https://qrcraftly.fpderuiter.workers.dev` and `https://qrcraftly.com`.

#### Step 5: Verify Production Deployment

1. **GitHub Releases Tab**:
   - Go to `https://github.com/fderuiter/QRCraftly/releases`
   - Verify that tag `vX.Y.Z` has been published with "Latest" badge and complete release notes.
2. **Production URL**:
   - Visit `https://qrcraftly.com`
   - Test generating a QR code to confirm production edge deployment is live and healthy.

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
