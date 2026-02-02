## 2024-05-23 - [Canvas Optimization]
**Learning:** Batching canvas path operations (e.g., `ctx.rect`) and filling once is significantly faster than immediate drawing (`ctx.fillRect`) for complex, repetitive shapes like QR code modules.
**Action:** When optimizing canvas rendering, consolidate individual draw calls into single paths where possible, but ensure to update tests that spy on specific draw methods (e.g., `fillRect` vs `rect`).
