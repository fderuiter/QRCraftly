## 2025-02-21 - Missing Test Coverage for Clipboard API Integration
**Discovery:** The `handleCopy` function in `useQRDownload.ts` lacked test coverage. It relied on `navigator.clipboard.write` and `ClipboardItem`, which might fail silently or throw errors across different browser environments without proper coverage.
**Defense:** Added test cases testing `handleCopy` when `ClipboardItem` is available and when it throws, ensuring fallback behaviors and error handling are robust.
