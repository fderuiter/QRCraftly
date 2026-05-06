1. **Apply section-splitting to `validGrid` in `src/utils/qr-renderers/modules.ts`**
   - In `getModuleDrawer` for `QRStyle.CIRCUIT`, `validGrid` currently iterates over all rows and columns and calls `isEye` inside the loop.
   - Refactor the loop into three sections (Top, Middle, Bottom) to skip eye corners (Top-Left, Top-Right, Bottom-Left).
   - Remove the `isEye` check inside the loop.
2. **Create/Update `.jules/bolt.md`**
   - Add a journal entry explaining the learning: pre-calculating spatial grids using section-splitting to skip known dead zones.
3. **Pre-commit step**
   - Run `pre_commit_instructions` to ensure proper testing, verification, review, and reflection are done.
4. **Submit PR**
   - Title: `⚡ Bolt: [performance improvement]`
   - Follow Bolt's format for the description.
