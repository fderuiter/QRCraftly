## 2025-05-15 - [Strictly Typed Input Registry]
**Context:** `INPUT_REGISTRY` used `any` and loose types, leaking `any` into `useInputLogic` state and creating a "black box" for input data structures.
**Decision:** Implemented a `InputDataMap` and `Registry` mapped type to bind `QRType` enums to their corresponding data interfaces. Refactored `useInputLogic` to use these types internally.
**Consequence:** Removes implicit `any` from core input logic. Requires casting/asserting in generic functions handling union types (`handleInputChange`) but provides strict type safety for the registry definition itself.

## 2026-02-28 - [DOM Event Encapsulation]
**Context:** Components like `QRTool` had raw `useEffect` hooks mixed into their bodies to manage `mousedown` and `touchstart` events for closing dropdown menus when clicking outside. This increased component size and violated the Single Responsibility Principle.
**Decision:** Created a reusable `useOnClickOutside` hook in `src/utils/hooks.ts` to encapsulate DOM event listener logic.
**Consequence:** Centralizes event listener setup/teardown logic, reducing component clutter and promoting DRY principles for popup/modal behaviors.
