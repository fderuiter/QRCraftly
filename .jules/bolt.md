
## 2024-05-24 - Section-splitting and 1D Indexing in Spatial Grids
**Learning:** Pre-calculating spatial grids with flat arrays inside loops is still a performance bottleneck if inner conditional checks (`isEye`) occur for every cell. Additionally, 2D array coordinates (`[r][c]`) mapped to 1D via repeated multiplication (`r * size + c`) in hot loops adds unnecessary math overhead.
**Action:** When pre-calculating spatial grids (e.g., `validGrid`), apply 'section-splitting' to break the loops into multiple chunks that inherently skip known dead zones entirely instead of relying on conditionals inside the loop. Use flat 1D indexing and calculate row offsets outside the inner loop to save multiplication overhead.
