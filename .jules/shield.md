## 2025-05-06 - Unawaited Promise inside try/catch

**Discovery:** When returning a `Promise` from within a `try/catch` block, if the promise is not awaited (`return new Promise(...)`), any rejection inside that promise skips the local `catch` block. This leads to an unhandled promise rejection and prevents fallback mechanisms from firing, creating a silent failure.

**Defense:** Always use `return await new Promise(...)` when creating and returning a promise inside a `try/catch` block so that asynchronous rejections are properly caught and handled by the surrounding logic. Added a specific test mimicking a FileReader `.onerror` event to enforce the fallback behavior.
## 2025-02-12 - Unhandled Promise Rejections in try/catch

**Discovery:** Returning `new Promise(...)` directly from inside a `try/catch` block allows asynchronous promise rejections (like a `FileReader` throwing an error) to completely bypass the local `catch` handler, causing an unhandled rejection that escapes the function boundary.

**Defense:** When wrapping a dynamically created Promise with a `try/catch` intended to handle its errors, you must explicitly `await` the Promise (e.g. `return await new Promise(...)`). Additionally, tests simulating such errors must restore any mocked globals (like `fetch` or `FileReader`) inside a `try/finally` block to prevent test pollution if assertions fail.
