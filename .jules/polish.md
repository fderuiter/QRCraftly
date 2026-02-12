## 2024-05-22 - [Magic Strings in Data Types]
**Smell:** Primitive Obsession - hardcoded string literals (e.g., 'WPA', 'nopass') used repeatedly across types, components, and helpers.
**Remedy:** Extract to shared Enums (e.g., `WifiEncryption`) to enforce consistency and enable safe refactoring.

## 2024-05-23 - [Implicit Module Coupling]
**Smell:** Utility modules re-exporting functions from other utilities (Facade pattern in the same layer), creating ambiguous sources of truth.
**Remedy:** Import directly from the canonical source module to make dependencies explicit and reduce circular references.

## 2025-02-14 - [Massive Render Loops]
**Smell:** Long Functions - React components mixing state logic (e.g., hooks, data generation) with low-level canvas drawing commands (e.g., switch statements for individual shapes), making components hard to read and test.
**Remedy:** Extract pure canvas drawing logic into helper functions that accept `ctx` and `config` as arguments, separating "what to draw" from "where to draw".
