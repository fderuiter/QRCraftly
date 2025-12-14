## 2025-12-13 - Sync Canvas Rendering Pattern
**Learning:** React `useEffect` + Canvas async image loading is a trap. If you `await` inside a render effect, you risk race conditions and "flashing" on frequent updates (like typing).
**Action:** Lift image loading out to a `useImage` hook that returns the `HTMLImageElement` or `null`. Pass the *loaded* image to the canvas renderer so drawing is always synchronous and deterministic.
