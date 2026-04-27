## 2024-04-27 - Remove explicit fieldSize="xs" passing

**Smell:** Duplicate `fieldSize="xs"` props passed to `TextField`, `TextAreaField` and `SelectField` across `*Input` components. The default is 'sm' in FormFields.tsx, but 'sm' is never used.

**Remedy:** Change the default `fieldSize` in `FormFields.tsx` to `xs`, and remove `fieldSize="xs"` everywhere.
