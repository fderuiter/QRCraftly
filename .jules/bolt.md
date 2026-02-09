## 2024-05-23 - [Canvas Optimization]
**Learning:** Batching canvas path operations (e.g., `ctx.rect`) and filling once is significantly faster than immediate drawing (`ctx.fillRect`) for complex, repetitive shapes like QR code modules.
**Action:** When optimizing canvas rendering, consolidate individual draw calls into single paths where possible, but ensure to update tests that spy on specific draw methods (e.g., `fillRect` vs `rect`).

## 2024-05-24 - [Complex Shape Batching]
**Learning:** Even complex shapes with internal transformations (like `ctx.rotate` for GRUNGE style) can be batched into a single path. The path points are transformed by the matrix active at the time they are added, so `ctx.save()`/`ctx.restore()` within a loop correctly adds transformed sub-paths to the main path.
**Action:** Use the `addToPath` pattern in canvas helpers to allow both immediate drawing (for single use) and path accumulation (for batching) without code duplication.
