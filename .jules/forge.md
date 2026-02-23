# Forge's Journal - Architectural Decisions

## 2025-02-18 - Decomposed God Utility
**Context:** `src/utils/qrHelpers.ts` was a catch-all for disparate QR string construction logic (WiFi, Email, Payment, etc.), violating SRP.
**Decision:** Extract logic into domain-specific modules in `src/utils/qr-generators/` and use `src/utils/qrHelpers.ts` as a facade for backward compatibility.
**Consequence:** Increases file count but significantly improves discoverability, cohesion, and testability.
