## 2025-05-15 - Registry Pattern for Form Inputs
**Smell:** Multiple `useQRInputState` hooks called in a component, leading to repetitive setup and verbose state management (Duplication).
**Remedy:** Extracted configuration (Component, Initial State, Constructor) to a `Registry` object. Replaced individual hooks with a single state object and a generic handler driven by the registry keys. This reduced code lines and centralized configuration.
