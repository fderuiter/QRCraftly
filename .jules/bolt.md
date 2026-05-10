## 2024-05-10 - [Optimization] Pre-calculate values in 2D Hot Loops

**Learning:** When executing mathematical checks inside nested loops iterating across a 2D grid, evaluating geometric offsets recursively per cell introduces redundant calculation.
**Action:** Extract repeating row and column computations out of nested hot loops by caching them into typed flat arrays.
