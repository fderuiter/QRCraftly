# Shield's Journal 🛡️

## 2025-02-18 - Missing Unit Tests for Color Utility
**Discovery:** The `colorUtils.ts` file, which is critical for accessibility compliance (contrast checks), has no dedicated unit tests. It relies on integration tests in `StyleControlsContrast.test.tsx`, which don't cover edge cases or invalid inputs.
**Defense:** Created `src/utils/colorUtils.test.ts` to strictly verify `getLuminance` and `getContrastRatio` behavior, ensuring deterministic calculations and safe handling of invalid inputs.

## 2025-02-18 - Non-deterministic Canvas Drawing
**Discovery:** The `drawScribble` function in `canvasHelpers.ts` uses `Math.random()`, making it impossible to test deterministically without mocking.
**Defense:** Implemented `vi.spyOn(Math, 'random')` in `src/utils/canvasHelpers.test.ts` to force a predictable sequence of random numbers, ensuring the test passes consistently on every run.
