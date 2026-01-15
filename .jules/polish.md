## 2024-05-22 - [Magic Strings in Data Types]
**Smell:** Primitive Obsession - hardcoded string literals (e.g., 'WPA', 'nopass') used repeatedly across types, components, and helpers.
**Remedy:** Extract to shared Enums (e.g., `WifiEncryption`) to enforce consistency and enable safe refactoring.
