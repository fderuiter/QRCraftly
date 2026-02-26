## 2025-05-15 - [Strictly Typed Input Registry]
**Context:** `INPUT_REGISTRY` used `any` and loose types, leaking `any` into `useInputLogic` state and creating a "black box" for input data structures.
**Decision:** Implemented a `InputDataMap` and `Registry` mapped type to bind `QRType` enums to their corresponding data interfaces. Refactored `useInputLogic` to use these types internally.
**Consequence:** Removes implicit `any` from core input logic. Requires casting/asserting in generic functions handling union types (`handleInputChange`) but provides strict type safety for the registry definition itself.
