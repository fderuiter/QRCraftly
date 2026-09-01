# Deep modules

This directory contains standalone deep modules adhering to strict structural encapsulation boundaries.

```text
src/packages/<name>/
  index.ts       # Primary root entry point (public interface)
  <entry>.ts     # Optional secondary entry points (e.g., maze.ts)
  lib/           # Private implementation (forbidden to external importers)
  tests/         # Co-located tests and fixtures (importing strictly through root entry points)
```

## Architectural Invariants

- **Entry-Point Seam**: External application code and tests may only import through root entry-point files (`src/packages/<pkg>/<entrypoint>.ts` or `@/packages/<pkg>`). Files inside `lib/` are strictly private implementation.
- **Intra-Package Freedom**: Implementation files within a package's `lib/` directory can freely cross-import one another.
- **Tests Through Entry Points**: Test suites in `tests/` import only public symbols through root entry points (`../index` or `@/packages/<pkg>`).
- **Acyclic Dependency Graph**: No cyclical dependencies between packages.
- **Automated Verification**: Enforced on every build via `pnpm run lint:boundaries` (`dependency-cruiser`).

## Registered Packages

### `scannability` (`@/packages/scannability`)

- **Purpose**: Zero-copy off-thread Web Worker scannability audits, contrast checks, and optical simulation.
- **Entry Points**:
  - `index.ts`: Worker runners, optical blur/contrast math, `auditModuleContrast`, `calculateBlurRadius`, `applyOpticalSimulationMath`, and telemetry tracking.

### `qr-matrix` (`@/packages/qr-matrix`)

- **Purpose**: Full QR code matrix visual orchestration, styles, locator eyes, logo cutouts, alignment pattern zones, and playable maze generation.
- **Entry Points**:
  - `index.ts`: `drawQR`, `drawQRInternal`, `renderBorder`, `renderEyes`, `renderModules`, `renderFluidModules`, `renderLogo`, `renderMaze`, layout and logo math.
  - `maze.ts`: `generateMaze`, `getMazeCacheKey`, `mazeCache`, `clearMazeCache`, `getStyleAdaptiveMazePathWidth`, `renderMaze`, `applyMazeHaloMask`, and bridge validation helpers.
