## 2025-05-15 - Colocation of Input Components
Context: InputPanel.tsx was a "God Component" handling rendering for 8+ different QR types, leading to high cognitive load and poor maintainability.
Decision: Extracted individual input forms into dedicated sub-components within `src/components/inputs/`.
Consequence: Improves readability and separation of concerns. Future input types should follow this pattern of having a dedicated component in `src/components/inputs/` that receives data and an onChange handler.

## 2025-05-18 - Composition of Style Controls
Context: StyleControls.tsx was a 450+ line "God Component" handling multiple distinct styling concerns (Border, Pattern, Color, Logo, Advanced), making it difficult to maintain and reason about.
Decision: Decomposed `StyleControls.tsx` into atomic sub-components (`BorderControls`, `PatternControls`, `ColorControls`, `LogoControls`, `AdvancedControls`) located in `src/components/style-controls/`. Used Component Composition to rebuild the main component.
Consequence: Drastically reduced cognitive load (main file < 60 lines). Each styling concern is now isolated, making future updates (e.g., adding new border styles) safer and more focused.
