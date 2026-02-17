## 2025-05-15 - Colocation of Input Components
Context: InputPanel.tsx was a "God Component" handling rendering for 8+ different QR types, leading to high cognitive load and poor maintainability.
Decision: Extracted individual input forms into dedicated sub-components within `src/components/inputs/`.
Consequence: Improves readability and separation of concerns. Future input types should follow this pattern of having a dedicated component in `src/components/inputs/` that receives data and an onChange handler.
