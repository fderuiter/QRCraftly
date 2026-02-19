# Forge's Architectural Journal

## 2025-02-18 - Strategy Pattern for QR Types
**Context:** `src/utils/qrHelpers.ts` was becoming a God File containing string construction logic for every QR type. `src/components/inputs/useInputLogic.ts` had high cyclomatic complexity and required "Shotgun Surgery" to add new types (touching types, helpers, inputs, and logic).
**Decision:** Implement the Strategy Pattern. Each QR Type (WiFi, Email, etc.) now has a dedicated Strategy file in `src/strategies/` that encapsulates its Initial State, String Construction Logic, and Input Component.
**Consequence:** `useInputLogic.ts` is now a simple orchestrator. `qrHelpers.ts` is deleted. Adding a new type is now done by adding a new Strategy file and registering it, rather than modifying multiple shared files. Trade-off is a slight increase in file count.
