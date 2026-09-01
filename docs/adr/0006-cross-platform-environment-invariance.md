---
status: accepted
---

# Cross-Platform Environment Invariance and Path Canonicalization

## Context

Development on QRCraftly occurs across diverse operating systems (Windows, macOS, Linux) and continuous integration runners. Discrepancies in filesystem path separators (`\` vs `/`), file line endings (`CRLF` vs `LF`), child process binary resolution (`.cmd` vs POSIX executables), and case-sensitivity can introduce subtle bugs, failing tests, or corrupted build artifacts across environments.

## Decision

We enforce complete platform agnosticism and path canonicalization across all repository tooling, scripts, and tests:

1. **Path Canonicalization**: All internal file path representations, AST auditors, and static scanners strictly canonicalize relative paths using POSIX forward slashes (`/`).
2. **Defensive Line Endings**: Repository line endings are standardized to `LF` via `.gitattributes`, and all script/test string parsing defensively handles both `LF` and `CRLF` using `/\r?\n/`.
3. **Cross-Platform Child Process Execution**: Command execution in scripts and tests uses centralized execution helpers that abstract platform-specific shell resolution without scattered platform branching.
4. **Automated Path Invariance Auditor**: An automated auditor (`scripts/path_invariance_auditor.js`) is integrated into `pnpm run lint` to block hardcoded drive letters, absolute user paths, unhandled line splits, and platform branching regressions.

## Rationale

Decoupling repository operations from host operating system peculiarities ensures identical developer experience and CI reproducibility on Windows, macOS, and Linux without fragile platform-specific hacks.

## Consequences

- All scripts, linters, tests, and build steps succeed identically across Windows, macOS, and Linux.
- Hardcoded host paths, Windows drive letters (`C:\`), or raw `split('\n')` fail the lint quality gate.
- Binary assets and line endings are strictly governed by `.gitattributes`.
