## 2024-05-23 - Micro-interactions matter
**Learning:** Even simple dropdowns cause frustration if they don't support "click outside to close". Users expect this behavior natively.
**Action:** Always wrap custom dropdowns in a `useClickOutside` hook or similar logic.

## 2024-05-23 - Accessibility roles
**Learning:** Adding `role="menu"` and `role="menuitem"` to custom dropdowns helps screen readers understand the structure better than just a list of buttons.
**Action:** Use these roles for custom action menus.

## 2025-01-29 - Character Counts and Accessibility
**Learning:** `aria-describedby` is essential for associating helper text (like character counts) with inputs. `aria-live="polite"` works for updates but can be verbose; use sparingly.
**Action:** When adding helper text that updates dynamically, always link it via `aria-describedby` to the input.
