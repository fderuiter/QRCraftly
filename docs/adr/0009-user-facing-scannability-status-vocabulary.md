---
status: accepted
---

# User-Facing Scannability Status Vocabulary

## Context

Prior iterations of the scannability user interface communicated validation outcomes using internal technical terms: "Physical-Ready", "Digital-Only Pass", and "Low Scannability". While these labels mapped directly to internal threshold enumerations, testing and user feedback indicated ambiguity:

1. "Physical-Ready" lacked clarity regarding the simulated optical conditions (camera blur, contrast margin) under which the code was validated.
2. "Digital-Only Pass" sounded like an arbitrary restriction rather than an actionable signal that optical contrast passed on digital screens but required empirical testing before volume physical print runs.
3. "Low Scannability" gave insufficient indication that the system actively tested barcode decodability and localized module contrast.

## Decision

We standardize on explicit, verification-oriented terminology across all visual indicators, tooltip guidance, and screen-reader announcements:

1. **Print Simulation Verified** (replaces _Physical-Ready_): Indicates optical decodability under simulated physical print conditions (blur, glare, and localized contrast audits).
2. **Screen Scan Verified** (replaces _Digital-Only Pass_): Indicates reliable digital screen scannability with the contextual guidance: _"Test with a physical camera before large print runs."_
3. **Scan Verification Failed** (replaces _Low Scannability_): Indicates that barcode decodability failed or localized module contrast dropped below acceptable optical thresholds.

## Rationale

This vocabulary clarifies the empirical nature of the off-thread scannability engine without confusing users with internal engine mechanics. It reinforces confidence in physical print readiness while providing actionable guidance for borderline cases.

## Consequences

- UI components (`src/components/ScannabilityIndicator.tsx`) and corresponding screen-reader `aria-label` / alert announcements use the verified terminology.
- Canonical terminology is preserved in `CONTEXT.md` under `### Off-Thread Performance`.
- Test suites asserting indicator text and accessibility announcements validate this standardized vocabulary.
