## 2025-05-06 - Unawaited Promise inside try/catch

**Discovery:** When returning a `Promise` from within a `try/catch` block, if the promise is not awaited (`return new Promise(...)`), any rejection inside that promise skips the local `catch` block. This leads to an unhandled promise rejection and prevents fallback mechanisms from firing, creating a silent failure.

**Defense:** Always use `return await new Promise(...)` when creating and returning a promise inside a `try/catch` block so that asynchronous rejections are properly caught and handled by the surrounding logic. Added a specific test mimicking a FileReader `.onerror` event to enforce the fallback behavior.
