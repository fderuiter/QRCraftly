## 2026-04-29 - Playwright Installation Requirement
**Insight:** Running End-to-End tests via `pnpm test:e2e` fails consistently on fresh environments because Playwright browsers are not installed by default with `pnpm install`.
**Guideline:** Always document the requirement to run `pnpm exec playwright install` before attempting to run Playwright E2E tests in a new environment.
