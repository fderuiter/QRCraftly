# Forge's Journal

## 2025-05-18 - Strictly Typed Input Registry

**Context:** The `INPUT_REGISTRY` used `any` for its values, and `useInputLogic` relied on loose typing and `Record<string, any>`, making it hard to track data structures for different QR types and prone to regression when modifying inputs.

**Decision:** Implemented a strictly typed `InputRegistry` using a `QRDataMap` that maps `QRType` to its specific data interface. Updated `useInputLogic` to leverage this map and `ComplexQRType` keys.

**Consequence:**
*   **Pros:** Compile-time safety for all input data structures. Usage of `any` is eliminated in core logic (except for necessary casts to satisfy TS limitations with generic keys).
*   **Cons:** Adding a new QR type now requires updating `QRDataMap` in addition to the registry, but this ensures consistency.
