# SHIELD'S JOURNAL 🛡️

## 2025-05-21 - VCard URL Normalization
**Discovery:** VCard QR codes were being generated with invalid URLs when users entered spaces or omitted protocols. This resulted in unscannable or broken links. The `new URL()` constructor behavior (adding trailing slashes) also caused a regression in strict equality tests.
**Defense:** Implemented `normalizeUrl` using the native `URL` API to handle spaces (encoding them) and protocols robustly. Added a regression test `src/utils/qrHelpers_VCardUrl.test.ts` to enforce this behavior and updated existing tests to expect normalized output (e.g., trailing slashes).

## 2025-10-27 - Logo Metrics Negative Values
**Discovery:** The `getLogoMetrics` utility did not validate logo size or padding inputs, allowing negative values to propagate. This resulted in negative dimensions for logo calculations, which could cause rendering errors or unexpected behavior.
**Defense:** Applied `Math.max(0, ...)` to `logoSize` and `padding` calculations in `src/utils/qr-renderers/utils.ts`. Added a specific regression test to verify graceful handling of negative inputs and ensure dimensions are clamped to at least 0.
