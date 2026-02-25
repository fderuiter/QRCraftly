## 2025-05-23 - Circular Progress for Character Limits
**Learning:** Visual indicators (circular progress) alongside text provide immediate feedback for limits without requiring cognitive load to read numbers.
**Action:** Use SVG-based circular progress indicators for limits where space permits.

## 2025-05-24 - Accessible Pattern Selection
**Learning:** For visual selection grids (like patterns/colors), relying on `aria-pressed` alone is insufficient for context. Explicit `aria-label` ("Select [Name] pattern") combined with high-visibility `focus-visible` rings significantly improves keyboard navigation and screen reader clarity.
**Action:** Always pair visual grid items with `aria-label` and `focus-visible` rings.
