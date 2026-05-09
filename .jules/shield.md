## 2025-05-09 - [Test Flakiness - setTimeout in tests]
**Discovery:** Found a test `falls back to the original URL if FileReader fails to read blob` in `src/utils/svgExport.test.ts` using `setTimeout` which is a known source of test flakiness, making the test asynchronous and non-deterministic.
**Defense:** Replace `setTimeout` with synchronous triggering of the mocked event (e.g. `this.onerror()`) or use proper Promise resolution to ensure deterministic execution of the test.
