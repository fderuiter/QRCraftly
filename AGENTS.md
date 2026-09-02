# AGENTS.md

Operating instructions and core invariants for AI agents working in this repository.

## Non-Negotiable Invariants

- **Package Manager**: Use `pnpm` exclusively. Never run `npm` or `yarn`. Node.js 22.14.0+ required.
- **Privacy & Storage Allowlist**: All QR code generation is strictly client-side. Never send user payloads across the network or encode user input into URL query parameters. The pre-build storage AST auditor (`scripts/storage_privacy_ast_auditor.js`) blocks any unapproved persistent browser storage. Only approved keys (`qr-telemetry-opt-in`, `qrcraftly:dynamic-redirects`, `qrcraftly:dynamic-consent-accepted`, `__test__`) are allowed.
- **UI Component Reuse**: Consult `docs/public/UI_CATALOG.md` before creating any visual element.
  - Range sliders: Always use `RangeInput` from `src/components/ui/RangeInput.tsx`.
  - Buttons: Always use `Button` from `src/components/ui/Button.tsx`.
  - Color pickers: Always use `ColorInput` from `src/components/ui/ColorInput.tsx`.
  - Color & contrast math: Never write custom luminance, hex normalization, or contrast formulas. Always import from `src/utils/colorUtils.ts` or `src/utils/a11y.ts`.
- **Tailwind CSS v4 (CSS-First)**: Theme variables, tokens, and dark mode variants live exclusively in `src/layouts/index.css` via `@theme` and `@variant`. There is no `tailwind.config.js`.
- **Platform Invariance & Path Canonicalization**: All repository tooling, AST auditors, scripts, tests, and build steps must be completely environment-agnostic (Windows, macOS, Linux). Never hardcode OS drive paths, platform-specific binaries (`npx.cmd`), or raw `split('\n')`. Always canonicalize relative paths using POSIX forward slashes (`/`), standardize line endings to `LF` with defensive regex splitting (`/\r?\n/`), and use `scripts/utils/execHelper.js` or `tests/utils/execHelper.ts` for process execution. Verified by `scripts/path_invariance_auditor.js`.

## Agent skills

### Issue tracker

GitHub Issues using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` and `docs/adr/` at repo root). Always consult `CONTEXT.md` for canonical domain terminology (avoiding listed `_Avoid_` synonyms) and `docs/adr/` for established architectural decisions. See `docs/agents/domain.md`.

Packages are deep modules: see [src/packages/README.md](./src/packages/README.md) before adding or importing one.

## Architecture & Deep Topic Pointers

- **Dynamic Edge Redirection & SSR**: Cloudflare Pages Functions (`functions/[[path]].ts`), D1 SQL database, KV edge caching, and zero-knowledge anchor hash encryption (`#key=...`). Read `docs/public/EDGE_ARCHITECTURE.md`.
- **Worker Concurrency & Scannability**: Off-thread Web Workers (`scannabilityWorker.ts`, `scannerWorker.ts`), zero-copy `ArrayBuffer` double-buffering, and client-side SVG generation via `SvgContext`. Read `docs/public/SCALING.md`.
- **Security & Sanitization**: SVG element allowlists (`sanitizeSvg`), phone/SMS sanitization, anchor link sanitization (`sanitizeHref`), and inline-script CSP hashing. Read `docs/SECURITY.md`.
- **HIPAA Compliance Guidelines**: Client-side volatile memory guarantees and telemetry schema rules. Read `docs/public/COMPLIANCE.md`.

## Quality & Development Standards

- **TypeScript**: Strict typing across all files. Proactively avoid `any` or loose type assertions (`as`).
- **Accessibility (a11y)**: Validate WCAG 2.1 SC 1.4.11 contrast compliance for UI states and generated QR codes. Test components with `vitest-axe` and screen-reader accessible labels.
- **Tailwind Formatting**: Run `pnpm run format:classes` to enforce standardized utility class ordering.

## Verification & Definition of Done

Before declaring any implementation task complete, verify your changes:

1. **Standard Code Changes**: Run and ensure passing:
   - `pnpm run lint` (runs AST storage checks, UI catalog validation, markdown audits, TypeScript type-checking, ESLint, Knip, contrast checks, Prettier, and duplication checks)
   - `pnpm test` (Vitest test suite)
2. **Build, Routing, or Core Generator Changes**: In addition to standard checks, run:
   - `pnpm build` (verifies SSR/SSG compilation, bundle size budget, and postbuild security scripts)
   - `pnpm test:e2e` (Playwright end-to-end verification, when modifying navigation, rendering, or input flows)
