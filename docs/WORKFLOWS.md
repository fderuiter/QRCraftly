# Git Workflows and Deployment Lifecycle

This document outlines the standard Git branching strategy, contribution workflows, quality gates, and edge deployment lifecycle for QRCraftly.

---

## 1. Branch Hierarchy and Topology

QRCraftly operates on a **Two-Tier Staged Promotion** model:

```
[ feat/*, fix/*, agent/* ]
             │
             ▼ (Pull Request)
           [ dev ]  (Default Integration Branch)
             │      └── Deploys to: https://dev-qrcraftly.fpderuiter.workers.dev/
             ▼ (pnpm run release:promote: fast-forward + vX.Y.Z tag)
          [ main ]  (Production Branch)
                    └── Deploys to: https://qrcraftly.fpderuiter.workers.dev/
                                    https://qrcraftly.com
```

### `dev` (Default Integration Branch)

- **Role**: Primary integration trunk for all active development.
- **Access**: Default branch for repository clones, forks, and new PRs.
- **Edge Deployment**: Automatically deployed by Cloudflare Workers Builds to the **Preview Staging Environment** at `https://dev-qrcraftly.fpderuiter.workers.dev/` with `X-Robots-Tag: noindex`.
- **Invariants**: Changes land only through squash-merged pull requests that pass the `CI` and `PR Title` checks.

### `main` (Production Branch)

- **Role**: Stable production release branch.
- **Access**: Protected. Direct pushes and standard feature PRs are prohibited.
- **Edge Deployment**: Automatically deployed by Cloudflare Workers Builds to the **Production Environment** at `https://qrcraftly.fpderuiter.workers.dev/` and `https://qrcraftly.com`.
- **Invariants**: Updated exclusively by `pnpm run release:promote`, which fast-forwards `main` to a reviewed release commit on `dev` and pushes the release tag with it. See [RELEASING.md](../RELEASING.md).

---

## 2. Semantic Branch Naming Taxonomy

All working branches created by human developers or autonomous AI agents must adhere to the following naming convention:

| Prefix      | Category      | Purpose                                                  | Example                            |
| ----------- | ------------- | -------------------------------------------------------- | ---------------------------------- |
| `feat/`     | Feature       | New user-facing capability or generator option           | `feat/vcard-notes-field`           |
| `fix/`      | Bugfix        | Defect remediation or error recovery                     | `fix/scannability-contrast-check`  |
| `docs/`     | Documentation | Architecture records (ADRs), guides, or glossary updates | `docs/workflow-standardization`    |
| `refactor/` | Refactoring   | Code restructuring preserving existing behavior          | `refactor/pure-service-signal-bus` |
| `chore/`    | Maintenance   | Tooling, dependency updates, or CI pipeline tweaks       | `chore/update-wrangler-assets`     |
| `agent/`    | Agent Tasks   | Scoped autonomous tasks initiated by AI agents           | `agent/harden-worker-watchdog`     |

---

## 3. Contributor & Agent Workflow (Step-by-Step)

### Step 1: Create Branch from `dev`

```bash
git checkout dev
git pull origin dev
git checkout -b feat/my-new-feature
```

### Step 2: Implement Changes with Local Quality Gates

Ensure pre-commit hooks and local audits pass before committing:

```bash
# Format and lint
pnpm run format:classes
pnpm run lint

# Run unit tests
pnpm test

# Run e2e tests (if modifying UI or interaction flows)
pnpm run test:e2e
```

### Step 3: Open Pull Request Targeting `dev`

Push your branch to GitHub and open a pull request targeting the **`dev`** branch. The PR title must be a [Conventional Commit](https://www.conventionalcommits.org/) (for example `fix(scanner): handle empty frames`), because it becomes the squashed commit subject that the changelog and version bump are built from. The `PR Title` check enforces this.

### Step 4: Automated CI Quality Gate Validation

GitHub Actions triggers the consolidated CI pipeline on the PR:

1. `setup`: Node.js 22.14.0, pnpm 11.1.3 toolchain verification.
2. `static-validation`: Storage privacy AST audit, UI catalog checks, markdown audit, TypeScript compiler (`tsc --noEmit`), depcruise module boundaries, ESLint, Knip, contrast checks, Prettier, code duplication check, ShellCheck, secret scanner, and Semgrep.
3. `test`: Vitest unit tests with strict coverage thresholds.
4. `e2e`: Playwright cross-browser tests across Chromium, Firefox, and WebKit.
5. `build`: Production build verification, bundle size budgets, and Lighthouse CI performance audits.
6. `dependency-audit`: `pnpm audit --audit-level=high`, reported as its own check. No other job depends on it, so a newly published upstream advisory flags the PR without skipping the checks above.
7. `ci`: the aggregate **`CI`** check. It passes only when jobs 1 to 5 all succeed, and it is the check the `dev` ruleset requires.

### Step 5: Ephemeral Branch Preview Verification

Cloudflare Workers Builds automatically detects the PR branch and deploys an ephemeral preview to:
$$\text{https://<branch-name>-qrcraftly.fpderuiter.workers.dev/}$$
Reviewers and agents can verify changes live in an edge environment before approval.

### Step 6: Merge into `dev`

Once `CI` passes and reviews are complete, merge with **Squash and merge**. Cloudflare automatically updates `https://dev-qrcraftly.fpderuiter.workers.dev/`, and the `Verify Preview Staging Environment` job smoke tests staging once it serves the new commit.

---

## 4. Staged Production Promotion (`dev` $\rightarrow$ `main`)

Releases, versioning, tags and rollback are documented in one place: [RELEASING.md](../RELEASING.md). In short:

1. `pnpm run release:prepare` opens a `release/vX.Y.Z` branch with the version bump and changelog. Merge it into `dev` through a PR.
2. `pnpm run release:promote` fast-forwards `main` to that commit and pushes the annotated `vX.Y.Z` tag in one atomic push.
3. Cloudflare Workers Builds deploys `main`. The `Release` workflow publishes the GitHub Release and smoke tests production.

**Never open a pull request from `dev` into `main`**, and never push to `main` any other way.

---

## 5. Cloudflare Domain and Edge Routing Summary

| Environment         | Target Branch | Active Domain                                                          | Access & Indexing                       |
| ------------------- | ------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| **Production**      | `main`        | `https://qrcraftly.fpderuiter.workers.dev`<br/>`https://qrcraftly.com` | Public, indexed by search engines       |
| **Preview Staging** | `dev`         | `https://dev-qrcraftly.fpderuiter.workers.dev`                         | Public staging, `X-Robots-Tag: noindex` |
| **PR Previews**     | `<branch>`    | `https://<branch>-qrcraftly.fpderuiter.workers.dev`                    | Ephemeral, `X-Robots-Tag: noindex`      |

---

## 6. Release Lifecycle, Hotfixes and Rollback

See [RELEASING.md](../RELEASING.md) for versioning rules, the release scripts, the changelog format, and the rollback procedure (roll back the Cloudflare deployment, then fix forward through `dev`).
