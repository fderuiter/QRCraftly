# Deep modules

This directory contains standalone deep modules adhering to strict structural encapsulation boundaries.

```text
src/packages/<name>/
  index.ts       # Primary root entry point (public interface)
  client.ts      # Optional secondary entry points (e.g. client.ts, maze.ts)
  lib/           # Private implementation (forbidden to external importers)
  tests/         # Co-located tests and fixtures (importing strictly through root entry points)
```

## The Four Boundary Rules

1. **Entry-point boundary from app**: App code outside a package may import only that package's root entry points (`src/packages/<pkg>/<entrypoint>.ts`), never anything inside its `lib/` or any other subfolder.
2. **Intra-package freedom**: Files within the same package import each other freely, but may reach other packages only through their root entry points, never their subfolder internals.
3. **Tests through entry points**: Test suites under `tests/` import strictly through root entry points (`../index` or `@/packages/<pkg>`), asserting against public interface behaviour. Tests may never reach into private subfolders (not even their own `lib/`).
4. **No circular dependencies**: Dependency cycles across modules and packages are forbidden.

## Barrels Discouraged

Packages may expose several small, purpose-built entry points (such as `index.ts`, `client.ts`, `worker.ts`) rather than funnelling everything through one giant barrel `index.ts`. Barrel files that blindly re-export an entire internal subtree are discouraged; keep entry points focused and hide implementation in subfolders.

## Copy-Me Starter Template

A committed starter template is provided in [`src/packages/example/`](./example/):

- `index.ts`: Public root entry point exporting high-level functions.
- `lib/impl.ts`: Private implementation file hidden in a subfolder.
- `tests/example.test.ts`: Test suite verifying behaviour exclusively through `../index`.

Copy this directory when scaffolding a new deep module, or delete it once custom modules are in place.

## Automated Verification

Run boundary verification at any time:

```bash
pnpm run lint:boundaries
```

Boundary checks run automatically during `pnpm run lint` and CI.

## Registered Packages

### `scannability` (`@/packages/scannability`)

- **Purpose**: Zero-copy off-thread Web Worker scannability audits, contrast checks, and optical simulation.
- **Entry Points**:
  - `index.ts`: Public API, contracts, optical blur/contrast math, `auditModuleContrast`, `calculateBlurRadius`, `applyOpticalSimulationMath`, and telemetry tracking.
  - `client.ts`: Headless React hook (`useScannability`) and UI state types.
  - `worker.ts`: Dedicated background Web Worker performing real-time contrast auditing and optical decoding.

### `qr-matrix` (`@/packages/qr-matrix`)

- **Purpose**: Full QR code matrix visual orchestration, styles, locator eyes, logo cutouts, alignment pattern zones, and playable maze generation.
- **Entry Points**:
  - `index.ts`: `drawQR`, `drawQRInternal`, `renderBorder`, `renderEyes`, `renderModules`, `renderFluidModules`, `renderLogo`, `renderMaze`, layout and logo math.
  - `maze.ts`: `generateMaze`, `getMazeCacheKey`, `mazeCache`, `clearMazeCache`, `getStyleAdaptiveMazePathWidth`, `renderMaze`, `applyMazeHaloMask`, and bridge validation helpers.

### `optical-scanner` (`@/packages/optical-scanner`)

- **Purpose**: Consolidated off-thread barcode decoding for live camera video streams, static images, and video files with adaptive backpressure throttling and watchdog fault recovery.
- **Entry Points**:
  - `index.ts`: Public API, polymorphic `scan(source, options)` for files/images, scanner contracts, and downscaling math.
  - `client.ts`: Headless React hook (`useQrScanner`) with integrated camera streaming and file drag-and-drop.
  - `scheduler.ts`: Secondary entry point exposing `AdaptiveFrameScheduler`, `DoubleBufferPool`, and worker recovery testing hooks.
  - `worker.ts`: Dedicated background Web Worker performing WebCodecs demuxing, EBML parsing, and jsQR optical decoding.

### `qr-payload` (`@/packages/qr-payload`)

- **Purpose**: Consolidated QR payload generation, hydration parsing, RFC 5545/6350 escaping, protocol identification, and security containment validation behind a stateless format/parse/validate seam.
- **Entry Points**:
  - `index.ts`: Polymorphic `formatPayload`, `parsePayload`, `validatePayload`, config validators `validateConfig` and `sanitizeConfig`, protocol parser `identifyProtocol`, `canHydrate`, RFC escaping helpers, and typed generator contracts (`WifiContract`, `EmailContract`, `VCardContract`, etc.).

### `optical-transfer` (`@/packages/optical-transfer`)

- **Purpose**: Air-gapped unidirectional optical data transmission via animated QR code streams, utilizing pure TypeScript Luby Transform rateless fountain codes over $\text{GF}(2)$, bounded preallocated frame pools, security stream lookahead sanitization, and dedicated Web Workers.
- **Entry Points**:
  - `index.ts`: Primary public API, high-level `createOpticalSender`, `createOpticalReceiver`, handshake protocols, fountain codec primitives (`LTEncoder`, `LTDecoder`, `RobustSolitonDistribution`), and contracts.
  - `sender.ts`: Sender engine abstraction orchestrating file slicing, RAF loop scheduling, dynamic FPS pacing, and fountain droplet generation.
  - `receiver.ts`: Receiver engine abstraction orchestrating worker-driven reassembly, deduplication, stream lookahead security validation, and complete file extraction.
  - `client.ts`: Headless React hooks (`useOpticalSender`, `useOpticalReceiver`) and UI state types.
  - `worker-slice.ts`: Background Web Worker handling non-blocking file slicing, checksum calculation, and droplet encoding.
  - `worker-reassembly.ts`: Dedicated background Web Worker handling chunk tracking, XOR fountain graph decoding, integrity verification, and blob assembly.
