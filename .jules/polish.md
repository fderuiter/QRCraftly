## 2025-05-15 - Registry Pattern for Form Inputs
**Smell:** Multiple `useQRInputState` hooks called in a component, leading to repetitive setup and verbose state management (Duplication).
**Remedy:** Extracted configuration (Component, Initial State, Constructor) to a `Registry` object. Replaced individual hooks with a single state object and a generic handler driven by the registry keys. This reduced code lines and centralized configuration.

## 2025-10-26 - Replace IIFE with Constant Map
**Smell:** Nested IIFE (Immediately Invoked Function Expression) used for simple configuration mapping inside a function, adding visual noise.
**Remedy:** Extracted the mapping logic to a top-level constant object (`SAFE_AREA_RATIOS`) and replaced the IIFE with a direct property lookup. This improves readability and separates configuration from logic.
