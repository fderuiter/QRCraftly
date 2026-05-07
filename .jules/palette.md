## 2026-05-07 - ARIA labels for Icon/Visual Buttons
**Learning:** When using custom icon or visual buttons mapped from an array (like logo border styles or error correction levels), standard text might be omitted or purely visual. Testing library errors explicitly surface missing accessible names.
**Action:** Ensure dynamically mapped custom toggle buttons include an explicit `aria-label` incorporating the dynamic label text (e.g. `Set ${feature} to ${label}`) so screen readers can interpret the action without relying on generic element content.
