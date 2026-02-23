## 2025-05-23 - Circular Progress for Character Limits
**Learning:** Visual indicators (circular progress) alongside text provide immediate feedback for limits without requiring cognitive load to read numbers.
**Action:** Use SVG-based circular progress indicators for limits where space permits.

## 2025-05-23 - Contrast-Safe Checkmarks for Color Presets
**Learning:** When overlaying a checkmark on a multi-colored element (like a QR preset), using the element's own background color (`bg`) for the checkmark ensures it is visible when placed over a contrasting foreground element (`eye`).
**Action:** Use `preset.bg` color for checkmarks overlaying `preset.eye` elements to guarantee accessible contrast without hardcoded values.
