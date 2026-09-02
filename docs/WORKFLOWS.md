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
             ▼ (Promotional Release PR)
          [ main ]  (Production Branch)
                    └── Deploys to: https://qrcraftly.fpderuiter.workers.dev/
                                    https://qrcraftly.com
```

### `dev` (Default Integration Branch)

- **Role**: Primary integration trunk for all active development.
- **Access**: Default branch for repository clones, forks, and new PRs.
- **Edge Deployment**: Automatically deployed by Cloudflare Workers Builds to the **Preview Staging Environment** at `https://dev-qrcraftly.fpderuiter.workers.dev/` with `X-Robots-Tag: noindex`.
- **Invariants**: Must always pass static validation, unit tests, and cross-browser e2e suites.

### `main` (Production Branch)

- **Role**: Stable production release branch.
- **Access**: Protected. Direct pushes and standard feature PRs are prohibited.
- **Edge Deployment**: Automatically deployed by Cloudflare Workers Builds to the **Production Environment** at `https://qrcraftly.fpderuiter.workers.dev/` and `https://qrcraftly.com`.
- **Invariants**: Updated exclusively via promotional pull requests from `dev` (or emergency hotfix rollbacks).

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

Push your branch to GitHub and open a pull request targeting the **`dev`** branch.

### Step 4: Automated CI Quality Gate Validation

GitHub Actions triggers the consolidated CI pipeline on the PR:

1. `setup`: Node.js 22.14.0, pnpm 11.1.3 toolchain verification.
2. `static-validation`: Storage privacy AST audit, UI catalog checks, markdown audit, TypeScript compiler (`tsc --noEmit`), depcruise module boundaries, ESLint, Knip, contrast checks, Prettier, code duplication check, ShellCheck, secret scanner, and Semgrep.
3. `test`: Vitest unit tests with strict coverage thresholds.
4. `e2e`: Playwright cross-browser tests across Chromium, Firefox, and WebKit.
5. `build`: Production build verification, bundle size budgets, and Lighthouse CI performance audits.

### Step 5: Ephemeral Branch Preview Verification

Cloudflare Workers Builds automatically detects the PR branch and deploys an ephemeral preview to:
$$\text{https://<branch-name>-qrcraftly.fpderuiter.workers.dev/}$$
Reviewers and agents can verify changes live in an edge environment before approval.

### Step 6: Merge into `dev`

Once all CI checks pass and reviews are complete, merge into `dev`. Cloudflare automatically updates `https://dev-qrcraftly.fpderuiter.workers.dev/`.

---

## 4. Staged Production Promotion (`dev` $\rightarrow$ `main`)

When a batch of features and fixes on `dev` has been verified in staging and is ready for production:

1. **Open Promotional PR**:
   - Source branch: `dev`
   - Target branch: `main`
   - Title: `release: vX.Y.Z` (or summary of promotional changes)
2. **Execute Full CI Gate**:
   - GitHub Actions runs the entire validation suite against the promotion PR.
3. **Merge Promotional PR**:
   - Merge `dev` into `main`.
4. **Production Deployment**:
   - Cloudflare Workers Builds automatically builds `main` and deploys to production:
     - `https://qrcraftly.fpderuiter.workers.dev/`
     - `https://qrcraftly.com`
5. **Release Tagging (Optional)**:
   - Tag the release commit: `git tag -a vX.Y.Z -m "Release vX.Y.Z"` and push to `origin`.

---

## 5. Cloudflare Domain and Edge Routing Summary

| Environment         | Target Branch | Active Domain                                                          | Access & Indexing                       |
| ------------------- | ------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| **Production**      | `main`        | `https://qrcraftly.fpderuiter.workers.dev`<br/>`https://qrcraftly.com` | Public, indexed by search engines       |
| **Preview Staging** | `dev`         | `https://dev-qrcraftly.fpderuiter.workers.dev`                         | Public staging, `X-Robots-Tag: noindex` |
| **PR Previews**     | `<branch>`    | `https://<branch>-qrcraftly.fpderuiter.workers.dev`                    | Ephemeral, `X-Robots-Tag: noindex`      |

---

## 6. Emergency Hotfix and Rollback Procedure

In the rare event that a critical defect reaches production:

1. Revert the offending commit on `main` via `git revert <commit-sha>`.
2. Push the revert commit directly to `main` (or via fast-tracked emergency PR).
3. Cloudflare immediately builds and deploys the reverted state to production.
4. Backport the revert into `dev` to keep staging synchronized:
   ```bash
   git checkout dev
   git pull origin dev
   git merge origin/main
   git push origin dev
   ```
