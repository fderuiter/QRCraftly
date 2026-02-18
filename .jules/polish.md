## 2024-05-22 - [Magic Strings in Data Types]
**Smell:** Primitive Obsession - hardcoded string literals (e.g., 'WPA', 'nopass') used repeatedly across types, components, and helpers.
**Remedy:** Extract to shared Enums (e.g., `WifiEncryption`) to enforce consistency and enable safe refactoring.

## 2024-05-23 - [Implicit Module Coupling]
**Smell:** Utility modules re-exporting functions from other utilities (Facade pattern in the same layer), creating ambiguous sources of truth.
**Remedy:** Import directly from the canonical source module to make dependencies explicit and reduce circular references.

## 2024-05-24 - [Complex Logic in JSX Render]
**Smell:** Nested Arrow Hell / Long Function - deeply nested `if` statements and complex conditional logic inside `.map()` loops within the component's return statement.
**Remedy:** Extract Component - move the conditional rendering logic into a small, focused sub-component (e.g., `PatternModule`) to simplify the parent component's JSX and improve readability.

## 2024-05-25 - [Long Switch in Render Loop]
**Smell:** Long Function / Switch Statements - A large `switch` statement inside the main rendering loop, mixing selection logic with execution logic.
**Remedy:** Extract Factory Function - Move the `switch` logic into a separate helper function (e.g., `getModuleDrawer`) that returns a closure for the specific drawing logic, separating concerns and simplifying the main loop.
