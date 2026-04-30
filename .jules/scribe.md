## 2024-05-15 - [Initial Scribe Journal Entry]
**Insight:** Established Scribe journal.
**Guideline:** Track critical learnings regarding documentation.
## 2025-02-27 - [Missing Playwright Installation]
**Insight:** Playwright E2E tests will fail with a confusing error message on fresh setups if `pnpm exec playwright install` is not run before `pnpm test:e2e`. This breaks the expected test onboarding path.
**Guideline:** Ensure both unit tests (Vitest) and E2E tests (Playwright) are documented in the README along with their specific system/tool prerequisites.
