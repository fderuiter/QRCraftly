## 2025-01-26 - Canvas Path Batching
**Learning:** The Canvas 2D API's `fill()` and `stroke()` methods are expensive operations. When rendering many independent shapes (like QR code modules), calling `ctx.fill()` for each shape creates a significant performance bottleneck.
**Action:** For repetitive shapes, construct a single path containing multiple subpaths (using `ctx.moveTo`) and call `ctx.fill()` once at the end. Refactor drawing helpers to separate path construction from rendering to enable this batching strategy.
