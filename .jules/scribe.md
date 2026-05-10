## 2026-05-10 - Fix Playwright config for pnpm
**Insight:** The Playwright configuration hardcoded `npm run dev` for the web server, which fails for users who strictly use `pnpm`.
**Guideline:** Always use the project's native package manager (e.g., `pnpm run dev`) in configuration files (like `playwright.config.ts`) instead of hardcoding `npm`, and ensure documentation matches the required tooling.
