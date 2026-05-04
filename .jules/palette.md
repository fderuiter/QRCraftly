
## 2024-05-04 - Native form input keyboard accessibility
**Learning:** Browsers often suppress or obscure default focus outlines on native form inputs like `<input type="color">` and `<input type="range">`. Relying on default browser behavior for these specific input types leads to poor keyboard navigation as users cannot tell which element has focus.
**Action:** Always apply explicit `focus-visible` styling (e.g., `focus-visible:ring-2 focus-visible:ring-offset-1`) using Tailwind utility classes to native input types like `range` and `color` to ensure a consistent, accessible experience for keyboard users across browsers.
