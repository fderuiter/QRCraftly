---
status: accepted
---

# Centralized UI Catalog and AST-Enforced Component Reuse

## Context

Independent UI implementations of slider inputs, color pickers, and button elements lead to visual fragmentation, inconsistent focus rings, WCAG accessibility violations (SC 1.4.11), and unnecessary bundle growth.

## Decision

We establish `docs/public/UI_CATALOG.md` as the authoritative registry for all reusable UI elements (`src/components/ui/`), form inputs (`src/components/inputs/`), and style controls (`src/components/style-controls/`). Developers and agents must reuse established components (`RangeInput`, `ColorInput`, `Button`) and shared color utilities (`normalizeHex`, `getContrastRatio`).

## Rationale

Centralizing visual primitives ensures accessible, keyboard-navigable UI components across the application. AST-based lineage checks in pre-commit and CI prevent component proliferation and code duplication.

## Consequences

- Consistent design language and verified WCAG contrast compliance across all generator panels.
- Prevents redundant controls from entering the codebase.
- Modifying UI components requires a concurrent update to `docs/public/UI_CATALOG.md`.
