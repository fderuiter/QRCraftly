# Forge's Journal - Architectural Decisions

## 2025-02-18 - Decomposed God Utility
**Context:** `src/utils/qrHelpers.ts` was a catch-all for disparate QR string construction logic (WiFi, Email, Payment, etc.), violating SRP.
**Decision:** Extract logic into domain-specific modules in `src/utils/qr-generators/` and use `src/utils/qrHelpers.ts` as a facade for backward compatibility.
**Consequence:** Increases file count but significantly improves discoverability, cohesion, and testability.

## 2025-02-24 - Unified Input Registry
**Context:** `useInputLogic` mixed special handling for simple types (URL, Text) with a registry pattern for complex types, leading to code duplication and inconsistency.
**Decision:** Migrate URL and Text inputs to `INPUT_REGISTRY` by introducing a `hydrateFn` to map string values to state objects.
**Consequence:** Eliminates conditional logic in the hook, enforces consistent behavior (like debouncing) across all inputs, and follows Open/Closed principle for future types.
