# 5. Centralized UI Catalog and AST-Enforced Component Reuse

## Context

In an expanding codebase worked on by multiple engineers and autonomous AI agents, ad-hoc range sliders, custom color pickers, and redundant button elements naturally proliferate. This causes design drift, inconsistent focus states, WCAG non-text contrast failures (SC 1.4.11), and unnecessary bundle weight.

## Decision

We establish `docs/public/UI_CATALOG.md` as the mandatory central registry for all reusable UI components (`src/components/ui/`), form inputs (`src/components/inputs/`), and style controls (`src/components/style-controls/`). Developers and agents must reuse existing primitives (`RangeInput`, `ColorInput`, `Button`, `TextField`) and shared color utilities (`normalizeHex`, `getContrastRatio`) rather than creating isolated implementations. Compliance is enforced via an AST validation script (`scripts/validate_ui_catalog.js`) and git lineage check in pre-commit and CI.

## Consequences

- Strict visual consistency, unified keyboard navigation, and WCAG accessibility conformance across all tools.
- Prevents component sprawl and duplicate utility algorithms.
- Any modification to UI components requires a concurrent update to `docs/public/UI_CATALOG.md`, which is enforced by automated pre-commit and CI gates.
