## 2025-03-09 - Fix Flaky Benchmark Timeout in Logo Rendering

**Discovery:**
A benchmark test in `src/utils/qr-renderers/utils.benchmark.test.ts` designed to test the performance of `getIsCoveredByLogo` loops `50,000` times. On lower-spec CI environments or under high load, this large number of iterations pushes execution time beyond the default `5000ms` Vitest timeout, causing a flaky `Error: Test timed out in 5000ms`.

**Defense:**
When writing performance benchmarks or loops with massive iterations in Vitest tests, explicitly provide a higher timeout parameter to the `test()` or `it()` call (e.g., `10000ms` or higher) to avoid random failures related to execution time in constrained environments.