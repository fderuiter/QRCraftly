# SHIELD'S JOURNAL 🛡️

## 2025-05-21 - VCard URL Normalization
**Discovery:** VCard QR codes were being generated with invalid URLs when users entered spaces or omitted protocols. This resulted in unscannable or broken links. The `new URL()` constructor behavior (adding trailing slashes) also caused a regression in strict equality tests.
**Defense:** Implemented `normalizeUrl` using the native `URL` API to handle spaces (encoding them) and protocols robustly. Added a regression test `src/utils/qrHelpers_VCardUrl.test.ts` to enforce this behavior and updated existing tests to expect normalized output (e.g., trailing slashes).
