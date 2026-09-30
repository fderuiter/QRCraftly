# Repository Rulesets

This directory holds the repository rulesets as JSON. GitHub does not read these files; an admin imports them under **Settings → Rules → Rulesets → New ruleset → Import a ruleset**. After importing, delete any older ruleset that covers the same branches or tags, such as a previous "Protect Main Branch" ruleset. The release process these rules support is described in [RELEASING.md](../../RELEASING.md).

## Rulesets

### `dev.json`: Protect dev (integration)

Applies to `dev`, the default branch every pull request targets.

- **Pull request required.** Direct pushes are blocked. Only **squash** merges are allowed, so each PR title becomes one Conventional Commit on `dev`.
- **Approvals:** `0`, because the project has a single maintainer and GitHub never lets authors approve their own PRs. Review threads must be resolved before merging.
- **Required status checks** (`integration_id` 15368 is GitHub Actions):
  - **CI**: the aggregate job in `.github/workflows/main.yml`. It succeeds only when setup, Consolidated Static Validation, Unit Tests, E2E Tests and Build all succeed. Requiring one aggregate check means renaming or adding jobs never leaves a PR waiting on a check that no longer reports.
  - **PR Title**: `.github/workflows/pr-title.yml`, which enforces Conventional Commit titles.
- **Branches don't need to be up to date** before merging (`strict_required_status_checks_policy: false`), which avoids re-running the full suite after every merge.
- **Deletion and force pushes are blocked.**
- **Bypass:** repository admins, in `pull_request` mode. Admins can merge a PR whose checks are failing, but can't push to `dev` directly.

`Dependency Audit` is intentionally not required. It reports new upstream advisories without blocking unrelated PRs.

### `main.json`: Protect main (production)

Applies to `main` and `backup`.

- **Creation, updates and deletion are restricted** to the bypass list, and **force pushes are blocked** for everyone.
- **Bypass:** repository admins only. The only thing that updates `main` is `pnpm run release:promote`, run by an admin, which pushes a fast-forward and the release tag atomically.
- There is no pull request rule and no required check. Nothing merges into `main` through a PR, and every commit it fast-forwards to already passed **CI** on `dev`.

### `tags.json`: Protect release tags

Applies to `refs/tags/v*`.

- **Creating, moving and deleting release tags is restricted** to repository admins. Release tags are only created by `pnpm run release:promote`.

## Format

Each file is a single raw JSON object (`{ ... }`), never an array, so it can be imported through the GitHub UI or the REST API. Check the syntax before importing:

```bash
node -e "for (const f of ['dev','main','tags']) JSON.parse(require('fs').readFileSync('.github/rulesets/' + f + '.json'))"
```

## Keeping them in sync

When you change a ruleset file, import it again and check the rules under **Settings → Rules → Rulesets**. When you rename a job that a ruleset requires, update the ruleset in the same PR. Prefer adding the job to the `needs` of the aggregate **CI** job instead.
