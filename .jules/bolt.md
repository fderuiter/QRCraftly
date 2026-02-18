## 2024-05-23 - [Canvas Optimization]
**Learning:** Batching canvas path operations (e.g., `ctx.rect`) and filling once is significantly faster than immediate drawing (`ctx.fillRect`) for complex, repetitive shapes like QR code modules.
**Action:** When optimizing canvas rendering, consolidate individual draw calls into single paths where possible, but ensure to update tests that spy on specific draw methods (e.g., `fillRect` vs `rect`).

## 2024-05-23 - [Complex Shape Batching]
**Learning:** Even complex shapes constructed with `ctx.save()`/`ctx.restore()` and transformations (like `GRUNGE` style rectangles) or multiple line segments (like `STARBURST`) can be batched by appending them to a single path instead of drawing immediately. This reduces draw calls from O(n) to O(1) for the rasterization step.
**Action:** Extend helper functions to accept an `addToPath` parameter that skips `beginPath` and `fill`, allowing the caller to manage the path lifecycle.

## 2025-02-23 - [Canvas Loop Hoisting]
**Learning:** Hoisting style selection and complex conditionals (like logo exclusion checks) out of the main rendering loop (30k+ iterations) significantly clarifies the code structure and likely improves performance by reducing per-iteration overhead.
**Action:** When implementing rendering loops with configurable styles, determine the drawing function beforehand rather than switching inside the loop.

## 2025-02-23 - [Trigonometry Intrinsic Performance]
**Learning:** In V8, `Math.cos` and `Math.sin` are extremely optimized intrinsics. Attempting to cache pre-calculated sine/cosine values in a JS `Array` or `Float64Array` for simple loop lookups proved slower (~3x) due to the overhead of array bounds checking and memory access compared to the raw math operation.
**Action:** Do not micro-optimize simple trigonometry in tight loops with caching unless the calculation is complex; trust the JS engine's math intrinsics.

## 2025-02-23 - [Loop Splitting for Static Exclusion]
**Learning:** When a loop contains a static conditional check that is true for specific predictable ranges (like QR code eye patterns in corners), splitting the loop into sections to skip those ranges entirely is more efficient (~23% faster) than checking the condition inside every iteration.
**Action:** Analyze loop invariants and ranges. If a "skip" condition applies to contiguous blocks, refactor the loop to avoid the check.
