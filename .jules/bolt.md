## 2025-10-26 - [Pre-calculated Render Map]
**Learning:** Complex QR styles like 'Circuit' perform redundant geometric checks (isEye, isCoveredByLogo) for neighbors. Pre-calculating a simple boolean/byte map of "renderable" modules allows neighbor checks to become O(1) array lookups instead of expensive function calls.
**Action:** When rendering grid-based systems where cells depend on neighbors, always pre-calculate cell state into a cheap lookup structure (like Uint8Array) to avoid re-computing derived state in the render loop.
