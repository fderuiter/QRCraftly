## 2025-03-09 - Extract Form Checkbox
**Smell:** Raw inline `<input type="checkbox">` elements scattered across form components, repeating styling logic and deviating from the established `FieldWrapper` pattern used by text and select inputs.
**Remedy:** Extracted a reusable `CheckboxField` component into `src/components/inputs/FormFields.tsx` to DRY out form checkbox styling and structure.
