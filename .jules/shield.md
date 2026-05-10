## 2025-02-13 - Eliminate Test Flakiness from setTimeout in svgExport.test.ts
**Discovery:** Tests relying on timers like setTimeout to trigger mock async events (e.g., `mockFileReaderInstance.onload` or `onerror`) can be flaky and non-deterministic, especially under load.
**Defense:** Explicitly invoke mock event handlers deterministically within `act()` blocks instead of relying on setTimeout or vi.advanceTimersByTime, maintaining a direct reference to the mock instance's callback (like `onload()` or `onerror()`).
