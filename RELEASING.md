# Releasing QRCraftly

This is the single runbook for how code moves from a branch to production, how versions and tags are made, and how to roll back. The decision record behind it is [ADR 0018](docs/adr/0018-release-pr-tag-driven-publishing.md).

## The flow at a glance

```
feat/*, fix/*, …  ──PR (squash, CI + PR Title required)──►  dev ──► staging
                                                                     dev-qrcraftly.fpderuiter.workers.dev
release/vX.Y.Z    ──release PR (chore(release): vX.Y.Z)──►  dev
                                                              │
                                   pnpm run release:promote   │  fast-forward + annotated tag, one atomic push
                                                              ▼
                                                            main ──► production
                                                             + vX.Y.Z   qrcraftly.com
                                                                        qrcraftly.fpderuiter.workers.dev
                                                              │
                                   Release workflow (on tag)  ▼
                                   verify tag → GitHub Release → wait for deploy → smoke tests
```

| Piece                                    | Owner                      | What it does                                                                                               |
| ---------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `dev`                                    | Pull requests only         | Integration branch and repository default. Every commit on it passed CI through a PR.                      |
| `main`                                   | `pnpm run release:promote` | Production. Only ever fast-forwarded to a release commit that already exists on `dev`. Same SHAs as `dev`. |
| `vX.Y.Z` tags                            | `pnpm run release:promote` | Annotated tag on the release commit. Pushed together with `main`.                                          |
| `package.json` `version`, `CHANGELOG.md` | Release PR                 | Written by `pnpm run release:prepare`, reviewed and merged like any other change.                          |
| Deploys                                  | Cloudflare Workers Builds  | Builds every push. `main` deploys to production; other branches upload preview versions.                   |
| `.github/workflows/main.yml`             | GitHub Actions             | Quality gate. The `CI` job is the one required check. After a push to `dev`, it smoke tests staging.       |
| `.github/workflows/release.yml`          | GitHub Actions             | Runs on a pushed `v*` tag. Never pushes. Publishes the GitHub Release and smoke tests production.          |

## Environments

| Environment | Branch     | URL                                                                 | Deployed by                                   |
| ----------- | ---------- | ------------------------------------------------------------------- | --------------------------------------------- |
| Production  | `main`     | `https://qrcraftly.com`, `https://qrcraftly.fpderuiter.workers.dev` | Workers Builds, on push to `main`             |
| Staging     | `dev`      | `https://dev-qrcraftly.fpderuiter.workers.dev` (noindex)            | Workers Builds preview version for `dev`      |
| PR previews | any branch | `https://<branch>-qrcraftly.fpderuiter.workers.dev` (noindex)       | Workers Builds preview version for the branch |

Every build writes `/version.json` (`{"version": "...", "commit": "..."}`), so you can check what an environment is serving:

```bash
curl -s https://qrcraftly.com/version.json
```

GitHub Actions holds no Cloudflare credentials and never deploys. Workers Builds reports its result as the `Workers Builds: qrcraftly` check on each commit.

## Day-to-day changes

1. Branch from `dev` with a standard prefix: `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`, `agent/`.
2. Open a PR into `dev`. Give it a [Conventional Commit](https://www.conventionalcommits.org/) title, such as `fix(scanner): handle empty frames`. The `PR Title` check enforces this.
3. Wait for the `CI` check to pass. Workers Builds posts a preview URL for the branch.
4. Merge with **Squash and merge**. The PR title becomes the commit subject on `dev`, which is what the changelog and version bump are built from.
5. After the merge, the `Verify Preview Staging Environment` job waits for staging to serve the new commit and runs the smoke tests against it.

### How titles map to versions

| Title                                                                             | Bump            |
| --------------------------------------------------------------------------------- | --------------- |
| `feat!: …`, `fix!: …`, or a `BREAKING CHANGE:` footer                             | major (`X.0.0`) |
| `feat: …`                                                                         | minor (`0.X.0`) |
| anything else (`fix`, `perf`, `refactor`, `docs`, `chore`, `ci`, `build`, `test`) | patch (`0.0.X`) |

While the version is `0.x`, breaking changes still bump the major version. Pass `--bump=minor` to `release:prepare` if you want to stay on `0.x`.

## Cutting a release

Do this from a local clone, as a repository admin. Admins are the only bypass actor on `main` and on `v*` tags.

### 1. Check dev is ready

- `dev` is green: the `CI` check passed on its latest commit.
- Staging looks right: open `https://dev-qrcraftly.fpderuiter.workers.dev` and check the recent changes.
- Preview the release:

  ```bash
  git checkout dev && git pull --ff-only origin dev
  pnpm run release:dry-run
  ```

### 2. Open the release PR

```bash
pnpm run release:prepare            # or: pnpm run release:prepare -- --bump=minor
git push -u origin release/vX.Y.Z
```

`release:prepare` refuses to run unless you are on a clean `dev` that matches `origin/dev`. It creates `release/vX.Y.Z`, updates `package.json` and `CHANGELOG.md`, and commits `chore(release): vX.Y.Z`. Edit the changelog on the branch if you want to reword entries, then open a PR into `dev` titled `chore(release): vX.Y.Z` and squash-merge it once `CI` passes.

### 3. Promote

```bash
git checkout dev && git pull --ff-only origin dev
pnpm run release:promote
```

`release:promote` never commits and never pushes `dev`. It checks that:

- you are on a clean `dev` that matches `origin/dev`
- `CHANGELOG.md` has a section for the `package.json` version
- the tag does not exist yet and the version is newer than the latest tag
- `origin/main` is an ancestor of `dev`, so the push is a fast-forward

Then it creates the annotated tag `vX.Y.Z` and runs:

```bash
git push --atomic origin HEAD:refs/heads/main refs/tags/vX.Y.Z
```

`main` and the tag land together or not at all. The push has no `--force`, so Git rejects it unless it is a fast-forward.

### 4. Watch it go out

- Workers Builds deploys `main` to production.
- The **Release** workflow runs on the tag. It checks that the tag is annotated, matches `package.json`, and is on `main`. It publishes the GitHub Release with the changelog section as notes. It waits until both production URLs serve the new `/version.json`, then runs the smoke tests against each.

If the workflow failed for an external reason, rerun it from **Actions → Release → Run workflow** with the tag, such as `v0.9.0`. Rerunning is safe; it edits the existing GitHub Release.

## Rolling back

Production problems are fixed in two steps: stop the bleeding, then fix forward.

1. **Roll back the deployment immediately.** In the Cloudflare dashboard, open **Workers & Pages → qrcraftly → Deployments** and roll back to the previous version. From a terminal you can also run `pnpm exec wrangler rollback` (it needs a Cloudflare login). This takes effect in seconds and does not touch Git. `main` and the tag stay where they are, so the next Workers Builds deploy from `main` replaces the rollback.
2. **Fix forward.** Land the fix, or a `revert:` of the bad change, on `dev` through a normal PR. Then cut a patch release (`release:prepare`, merge, `release:promote`).

To redeploy exactly what an older tag contained, roll back to that version in the dashboard. Every Workers Builds deploy from `main` is a version you can pick there.

Never push a revert straight to `main` and never move `main` backwards. Either one breaks the fast-forward from `dev` on the next release.

### When dev has changes that aren't ready

If you need a fix in production but `dev` also has unreleased work that can't ship yet:

1. Keep production on the rolled-back version in Cloudflare.
2. Revert the unready work on `dev` through a PR, or hold it behind its own flag, and land the fix.
3. Release as usual. Re-land the reverted work afterwards.

This keeps `main` a strict fast-forward of `dev`. There is no separate hotfix branch.

## Troubleshooting

**`release:promote` says `origin/main` has commits that `dev` does not.**
Something was pushed to `main` directly. Check with `git log --oneline origin/dev..origin/main`. Open a PR that merges `main` into `dev`, merge it, then promote again.

**The push was rejected.**
The atomic push is rejected when the `main` or tag rules block you (you are not an admin), or when it is not a fast-forward. Nothing was published. The engine deletes the local tag so you can retry.

**A tag has the wrong version.**
Tags are protected. As an admin, delete the GitHub Release and the tag (`git push origin :refs/tags/vX.Y.Z`), fix the version with a new release PR, and promote again. Don't reuse a version number that has already been deployed to production; release the next patch instead.

**The Release workflow timed out waiting for production.**
Check the `Workers Builds: qrcraftly` check on the tagged commit. A failed Cloudflare build leaves production on the previous version. Fix it on `dev` and release a new patch.

## One-time repository setup

These settings live in GitHub and Cloudflare, not in the repository, so an admin has to apply them.

- **Rulesets** (Settings → Rules → Rulesets → New ruleset → Import a ruleset): import `.github/rulesets/dev.json`, `.github/rulesets/main.json` and `.github/rulesets/tags.json`, and delete any older ruleset they replace. See [.github/rulesets/README.md](.github/rulesets/README.md).
- **Merge button** (Settings → General → Pull Requests): allow squash merging, with the default commit message set to **Pull request title**. Enable **Automatically delete head branches**.
- **Cloudflare Workers Builds** (Workers & Pages → qrcraftly → Settings → Build): check that the production branch is `main`, **Builds for non-production branches** is on (this is what serves staging and PR previews), the build command is `pnpm run build`, the deploy command is `npx wrangler deploy`, and the non-production deploy command is `npx wrangler versions upload`.
