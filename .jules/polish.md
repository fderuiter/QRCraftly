## 2025-05-15 - Registry Pattern for Form Inputs
**Smell:** Multiple `useQRInputState` hooks called in a component, leading to repetitive setup and verbose state management (Duplication).
**Remedy:** Extracted configuration (Component, Initial State, Constructor) to a `Registry` object. Replaced individual hooks with a single state object and a generic handler driven by the registry keys. This reduced code lines and centralized configuration.

## 2025-05-18 - Unified Input Registry Logic
**Smell:** Special casing for `URL` and `TEXT` inputs in `useInputLogic` (Primitive Obsession/Inconsistent Abstraction).
**Remedy:** Extended `InputRegistry` with `hydrateFn` to support simple string types, moving `URL` and `TEXT` handling into the registry. This removed conditional logic from the hook and standardized state management across all input types.
