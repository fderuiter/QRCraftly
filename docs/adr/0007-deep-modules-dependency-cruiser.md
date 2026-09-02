---
status: accepted
---

# Deep Modules and Automated Boundary Enforcement via Dependency-Cruiser

## Context

As QRCraftly expands with complex optical simulations, scannability health evaluation, SVG/canvas matrix generation, and dynamic edge redirection, unbounded internal imports and barrel files risk creating tight coupling, hidden dependency cycles, and fragile pass-through abstractions.

## Decision

We enforce a **deep module** architecture across `src/packages/` where every package exposes substantial functionality behind minimal root entry points while completely hiding internal implementation details inside subfolders (`lib/` and `tests/`):

1. **Entry-Point Seam**: External application code and other packages may import only a package's root entry points (`index.ts`, `client.ts`, `maze.ts`), never anything within its subfolders.
2. **Intra-Package Freedom**: Files inside a package's `lib/` directory may import each other freely to keep implementation complexity local.
3. **Tests Through Entry Points**: Package tests under `tests/` exercise the module through its public entry points, importing fixtures only from their local `tests/` folder without deep-importing internal implementation files.
4. **No Dependency Cycles**: Dependencies across the repository must remain strictly acyclic.
5. **No Monolithic Barrels**: Packages avoid large re-exporting barrel files, preferring multiple focused root entry points when exposing distinct capabilities.
6. **Automated Enforcement**: All boundary invariants are checked via `dependency-cruiser` (`pnpm run lint:boundaries` executing `depcruise src`), integrated into `pnpm run lint` and CI.

## Rationale

Encapsulating complex domain logic behind small entry points maximizes leverage for callers and locality for maintainers. Automated boundary auditing prevents architectural decay, eliminates circular dependencies, and ensures high testability.

## Consequences

- Packages under `src/packages/` have standardized layouts (`root entry points`, `lib/`, `tests/`).
- Rogue deep imports from app code or cross-package imports trigger linting errors in `pnpm run lint`.
- Adding new public functionality requires explicitly declaring it at a root entry point.
