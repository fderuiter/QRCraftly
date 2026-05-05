## 2025-02-12 - Unhandled Promise Rejections in try/catch

**Discovery:** Returning `new Promise(...)` directly from inside a `try/catch` block allows asynchronous promise rejections (like a `FileReader` throwing an error) to completely bypass the local `catch` handler, causing an unhandled rejection that escapes the function boundary.

**Defense:** When wrapping a dynamically created Promise with a `try/catch` intended to handle its errors, you must explicitly `await` the Promise (e.g. `return await new Promise(...)`). Additionally, tests simulating such errors must restore any mocked globals (like `fetch` or `FileReader`) inside a `try/finally` block to prevent test pollution if assertions fail.
