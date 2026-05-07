## 2025-05-07 - Playwright E2E Test Runner Configuration
**Insight:** The Playwright configuration hardcodes `npm run dev` for its webServer command, which can cause the tests to hang indefinitely if the local environment strictly uses `pnpm` and lacks `npm`.
**Guideline:** Document this limitation in the `README.md` Troubleshooting section so users know to either ensure `npm` is available or manually start `pnpm dev` before running `pnpm test:e2e`.
