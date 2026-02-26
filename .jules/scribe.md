## 2026-02-26 - Canvas System Dependencies Barrier
**Insight:** `npm install` fails by default on fresh environments because `node-canvas` (a dev dependency) requires system libraries (cairo, pango). New contributors expect `npm install` to just work for a web app.
**Guideline:** Explicitly document *why* these system deps are needed (for testing environment) and add a Troubleshooting section for the inevitable build errors.
