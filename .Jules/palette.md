## 2024-05-23 - Accessibility of Custom File Inputs
**Learning:** Custom file inputs using `div` with `onClick` are a common accessibility trap. They completely exclude keyboard users.
**Action:** Always use `<button type="button">` for custom triggers, even if they wrap complex content. It provides native keyboard focus and activation without extra aria-role or key handler code.
