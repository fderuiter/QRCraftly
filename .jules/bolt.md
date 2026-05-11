## 2025-05-09 - Pre-calculating constants in hot rendering loops
**Learning:** Even simple, native Math operations like `Math.ceil(cellSize)` add measurable performance overhead when called thousands of times per frame in a tight Canvas drawing loop (like QR code module rendering). Since `cellSize` is constant per QR code, calculating it inside the module closure causes redundant execution.
**Action:** Always inspect inner closures/hot loops (e.g. `getModuleDrawer`) for mathematical constants or object property lookups that can be extracted and pre-calculated in the outer scope, drastically reducing the operation count per-render.
## 2024-05-10 - [Optimization] Pre-calculate values in 2D Hot Loops

**Learning:** When executing mathematical checks inside nested loops iterating across a 2D grid, evaluating geometric offsets recursively per cell introduces redundant calculation.
**Action:** Extract repeating row and column computations out of nested hot loops by caching them into typed flat arrays.
