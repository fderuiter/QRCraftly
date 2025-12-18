## 2025-12-18 - Hidden CI Requirements
**Insight:** The CI pipeline enforces Type Checking (`npx tsc --noEmit`) and a strict 3MB Bundle Size limit, but these are not documented in `package.json` scripts or `README.md`.
**Guideline:** Always check `.github/workflows` to identify "ghost" build requirements that new contributors might miss.

## 2025-12-18 - Python Accessibility Checks
**Insight:** The project relies on `scripts/contrast_check.py` for WCAG compliance, which is a manual step not integrated into the standard `npm test` flow.
**Guideline:** Ensure manual compliance scripts are clearly documented in the "Quality Assurance" section of the README.
