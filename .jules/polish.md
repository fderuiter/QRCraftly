## 2025-05-03 - Form Field Layout Duplication
**Smell:** Duplicate layout structure (`div` wrapper, `label` element, and conditional `CharCount` rendering) repeated across `TextField`, `TextAreaField`, and `SelectField` in `src/components/inputs/FormFields.tsx`.
**Remedy:** Extracted the shared DOM structure into a local `FieldWrapper` component within the same file, updating all three field components to wrap their native HTML elements (`<input>`, `<textarea>`, `<select>`) with it.
