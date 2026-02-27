## 2025-05-15 - [Strictly Typed Input Registry]
**Context:** `INPUT_REGISTRY` used `any` and loose types, leaking `any` into `useInputLogic` state and creating a "black box" for input data structures.
**Decision:** Implemented a `InputDataMap` and `Registry` mapped type to bind `QRType` enums to their corresponding data interfaces. Refactored `useInputLogic` to use these types internally.
**Consequence:** Removes implicit `any` from core input logic. Requires casting/asserting in generic functions handling union types (`handleInputChange`) but provides strict type safety for the registry definition itself.

## 2025-05-16 - [Pure Path Tracing for Canvas Helpers]
**Context:** `drawPoly`, `drawStar`, etc. accepted boolean flags (`addToPath`, `fill`) to toggle between path definition and rendering, creating confusion (boolean arguments are a code smell) and coupling path logic with rendering commands.
**Decision:** Renamed functions to `trace*` (e.g., `tracePoly`) and stripped all rendering logic (`beginPath`, `fill`, `stroke`) and flags. These functions now exclusively define paths. Rendering control is inverted to the caller (e.g., `renderModules` handles batching via a single `fill` call).
**Consequence:** Callers must explicitly manage `ctx.beginPath()` and `ctx.fill()`. Improves batching flexibility and clarity but requires slightly more boilerplate for single-shape rendering.
