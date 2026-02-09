## 2024-05-23 - Micro-interactions matter
**Learning:** Even simple dropdowns cause frustration if they don't support "click outside to close". Users expect this behavior natively.
**Action:** Always wrap custom dropdowns in a `useClickOutside` hook or similar logic.

## 2024-05-23 - Accessibility roles
**Learning:** Adding `role="menu"` and `role="menuitem"` to custom dropdowns helps screen readers understand the structure better than just a list of buttons.
**Action:** Use these roles for custom action menus.

## 2024-05-24 - Explicit Value Feedback
**Learning:** Range inputs for precise settings (like size/padding) leave users guessing without explicit numeric feedback.
**Action:** Always pair range inputs with a formatted value display (e.g., percentage) to build trust and precision.
