# Repository Rulesets

This directory holds the repository rulesets as JSON. GitHub does not read these files; an admin imports them under **Settings → Rules → Rulesets → New ruleset → Import a ruleset**. After importing, delete any older ruleset that covers the same branches or tags, such as a previous "Protect Main Branch" or "Protect dev (integration)" ruleset. The release process these rules support is described in [RELEASING.md](../../RELEASING.md).

## Rulesets

### `main.json`: Protect main

Applies to the default branch, `main`, which is the only long-lived branch and deploys to production on every push.

- **Pull request required.** Direct pushes are blocked. Only **squash** merges are allowed, so each PR title becomes one Conventional Commit on `main`.
- **Approvals:** `0`, because the project has a single maintainer and GitHub never lets authors approve their own PRs. Review threads must be resolved before merging.
- **Required status checks** (`integration_id` 15368 is GitHub Actions):
  - **CI**: the aggregate job in `.github/workflows/main.yml`. It succeeds only when setup, Consolidated Static Validation, Unit Tests, E2E Tests and Build all succeed. Requiring one aggregate check means renaming or adding jobs never leaves a PR waiting on a check that no longer reports.
  - **PR Title**: `.github/workflows/pr-title.yml`, which enforces Conventional Commit titles.
- **Branches don't need to be up to date** before merging (`strict_required_status_checks_policy: false`), which avoids re-running the full suite after every merge.
- **Deletion and force pushes are blocked.**
- **Bypass:** repository admins, in `pull_request` mode. Admins can merge a PR whose checks are failing, but can't push to `main` directly.

`Dependency Audit` is intentionally not required. It reports new upstream advisories without blocking unrelated PRs.

### `tags.json`: Protect release tags

Applies to `refs/tags/v*`.

- **Moving and deleting release tags is restricted** to repository admins.
- **Creating them is not restricted**, because the Release workflow creates `vX.Y.Z` with the GitHub Actions token when a release PR merges.

## Format

Each file is a single raw JSON object (`{ ... }`), never an array, so it can be imported through the GitHub UI or the REST API. Check the syntax before importing:

```bash
node -e "for (const f of ['main','tags']) JSON.parse(require('fs').readFileSync('.github/rulesets/' + f + '.json'))"
```

## Keeping them in sync

When you change a ruleset file, import it again and check the rules under **Settings → Rules → Rulesets**. When you rename a job that a ruleset requires, update the ruleset in the same PR. Prefer adding the job to the `needs` of the aggregate **CI** job instead.
