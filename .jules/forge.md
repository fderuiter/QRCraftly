# Forge's Journal - Architectural Decisions

## 2025-02-18 - Decomposed God Utility
**Context:** `src/utils/qrHelpers.ts` was a catch-all for disparate QR string construction logic (WiFi, Email, Payment, etc.), violating SRP.
**Decision:** Extract logic into domain-specific modules in `src/utils/qr-generators/` and use `src/utils/qrHelpers.ts` as a facade for backward compatibility.
**Consequence:** Increases file count but significantly improves discoverability, cohesion, and testability.

## 2025-02-18 - Refactored Module Rendering
**Context:** `src/utils/qr-renderers/modules.ts` contained a complex `switch` statement for drawing different module styles, violating the Open/Closed Principle.
**Decision:** Extract drawing logic into a `MODULE_DRAWERS` registry (Strategy Pattern) in `src/utils/qr-renderers/moduleDrawers.ts`.
**Consequence:** New styles can be added without modifying the core rendering loop, at the cost of slight indirection.
