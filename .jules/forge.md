
## 2025-04-30 - Introduce Barrel Files for Component Modules
**Context:** Modules like `src/components/inputs/` had 10+ individual components exported, leading to massive import blocks in consumer files like `InputPanel.tsx` and `InputRegistry.ts` that were hard to read and manage.
**Decision:** Standardized the use of barrel files (`index.ts`) for all sub-module directories to consolidate exports.
**Consequence:** Reduces top-of-file import clutter (e.g. replacing 12 imports with 1), decoupling the internal directory structure from consumers while maintaining type safety.
