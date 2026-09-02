---
status: accepted
---

# Interactive Developer Experience Wizards and Platform-Invariant Runner

## Context

Setting up local development environments, provisioning Cloudflare edge infrastructure (Pages, D1 SQLite databases, KV namespaces), and configuring GitHub Actions CI/CD secrets involve manual, multi-step browser workflows. These tasks are prone to human error, missed configuration keys, and repetitive friction across team members and autonomous agents.

While bash scripts provide an interactive, lightweight interface for terminal guidance (opening URLs, capturing hidden secrets, and upserting environment files), executing interactive bash scripts on Windows systems can fail when run directly through PowerShell or Command Prompt.

## Decision

We introduce a structured interactive wizard suite paired with a platform-invariant Node.js wizard runner:

1. **Standardized Wizard UX**: All wizards follow a consistent bash library providing step-by-step progress tracking, cross-platform URL dispatch, hidden secret input, idempotent `.env` writes, and GitHub CLI secret provisioning.
2. **Platform-Invariant Runner**: A centralized Node.js runner (`scripts/run_wizard.js`) detects the host operating system, resolves an available `bash` binary (including Git Bash heuristics on Windows), and spawns the wizard with inherited standard I/O.
3. **Discoverable Entry Points**: Wizards are placed in `scripts/wizards/` and exposed via npm scripts (`pnpm run wizard:cloudflare`, `pnpm run wizard:github`, and `pnpm run wizard:dev`).
4. **Idempotency and Non-Destructive Storage**: Wizards safely upsert values into `.env` / `.env.local` without destroying existing keys, enabling developers to interrupt and resume the wizard at any time.

## Rationale

Interactive wizards dramatically reduce onboarding time and configuration mistakes. Pairing standardized bash templates with an environment-agnostic Node.js launcher satisfies the **Platform Invariance Guarantee** while preserving a terminal user experience.

## Consequences

- Infrastructure provisioning and CI secret configuration become guided, repeatable procedures.
- Developers on Windows, macOS, and Linux run wizards via identical `pnpm run wizard:<target>` commands.
- All wizard scripts are subjected to automated template structure and syntax checks in the test suite.
