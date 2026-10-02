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
  - `index.ts`: Public API: the headless Scannability Health Evaluator (`createScannabilityEvaluator`, one `ScannabilityAssessment` answer with status, health, export risk and recovery state), the pure `evaluateScannability`/`performScannabilityCheck` runners, `createScannabilityWorker()`, worker contracts, and optical blur/contrast math.
  - `client.ts`: Thin React adapter hook (`useScannability`) over the evaluator. App capabilities (failure reporting, module count) are injected; the package never imports app layers.
  - `worker.ts`: Dedicated background Web Worker performing real-time contrast auditing and optical decoding.

### `qr-matrix` (`@/packages/qr-matrix`)

- **Purpose**: Full QR code matrix visual orchestration, styles, locator eyes, logo cutouts, alignment pattern zones, and playable maze generation. Owns the one place a configuration becomes a module matrix (`buildMatrix`) and the Matrix and Maze Workers.
- **Entry Points**:
  - `index.ts`: `buildMatrix` (normalizes URL payloads, then encodes), `resolveEncodedValue`, `loadQrEncoder` (lazy `qrcode`), `fromQrcodePackage`, `QrEncoder`, the worker factories `createMatrixWorker` and `createMazeWorker`, `drawQR`, `drawQRInternal`, `renderBorder`, `renderEyes`, `renderModules`, `renderFluidModules`, `renderLogo`, `renderMaze`, layout and logo math.
  - `mosaic.ts`: Mosaic QR engine ([ADR 0019](../../docs/adr/0019-mosaic-qr-module-level-image-tiling.md)): `planMosaic`, `renderMosaic`, `rasterizeMosaic`, `sampleMosaicGrid`, `resolveMosaicThresholds`, `isMosaicFunctionModule`, and the in-memory image cache (`loadMosaicSource`, `getMosaicSource`).
  - `maze.ts`: `generateMaze`, `getMazeCacheKey`, `getCachedMaze`, `storeMaze`, `clearMazeCache`, `getStyleAdaptiveMazePathWidth`, `renderMaze`, `MazeData`, bridge validation helpers (`isBridgeCell`, `isFinderPatternWithMargin`), and the Maze Worker contract (`isMazeWorkerRequest`, `assertMazeWorkerRequest`, `isMazeWorkerResponse`, `assertMazeWorkerResponse`). The halo mask (`applyMazeHaloMask`) is private to `lib/maze.ts`.
  - `canvas.ts`: Canvas drawing primitives (`clampCornerRadius`, `drawRoundRect`, `drawPoly`, `drawStar`, `drawRoughRect`, `drawScribble`, and the module shape painters).
  - `worker-matrix.ts`: Background Web Worker that validates a configuration and serializes its `buildMatrix` output. Spawn it only through `createMatrixWorker()`.
  - `worker-maze.ts`: Background Web Worker running maze generation and A* pathfinding. Spawn it only through `createMazeWorker()`.

### `qr-export` (`@/packages/qr-export`)

- **Purpose**: Social template composition and self-contained SVG export: a `CanvasRenderingContext2D`-compatible SVG recorder, template frames and text, logo inlining, SVG sanitization and the offscreen scannability check before download.
- **Entry Points**:
  - `index.ts`: `generateQRSvg`, `rasterizeSvgToCanvas`, `validateSvgScannability`, `SvgContext`, `drawWithTemplate`, `SOCIAL_DIMENSIONS`.

### `arcade` (`@/packages/arcade`)

- **Purpose**: Headless game logic behind the QR Arcade (`/arcade`): target matrices, the Damage Simulator (blasts, barrages and Reed-Solomon damage analytics), the Arcade Blaster (micro-cell damage grid, projectile and particle physics), and the empirical scan pipeline that checks whether the damaged code still decodes.
- **Entry Points**:
  - `index.ts`: `buildTargetMatrix`, `analyzeDamage`, `applyBlast`, `planBarrage`, `MicroGrid`, the physics helpers, mode definitions (`ARCADE_MODES`, `parseArcadeMode`, `arcadeModeHref`) and `EmpiricalScanPipeline`.
  - `client.ts`: React hooks (`useEmpiricalScan`, `useMediaQuery`, `useReducedMotion`, `useLatestRef`).
  - `handoff.ts`: In-memory hand-off of a design from the generator to the arcade (`stageArcadeTarget`, `getStagedArcadeTarget`, `clearStagedArcadeTarget`).

### `optical-scanner` (`@/packages/optical-scanner`)

- **Purpose**: Consolidated off-thread barcode decoding for live camera video streams, static images, and video files with adaptive backpressure throttling and watchdog fault recovery.
- **Entry Points**:
  - `index.ts`: Public API, polymorphic `scan(source, options)` for files/images, the headless Camera Scanner Engine (`createCameraScannerEngine`), scanner contracts, and downscaling math.
  - `client.ts`: Thin React adapter hook (`useQrScanner`) over the Camera Scanner Engine, plus file drag-and-drop scanning.
  - `scheduler.ts`: Secondary entry point exposing `AdaptiveFrameScheduler`, `DoubleBufferPool`, and `terminateScannerWorker` (shared file-scan worker teardown). Worker spawning is private to the package.
  - `worker.ts`: Dedicated background Web Worker performing WebCodecs demuxing, EBML parsing, and jsQR optical decoding.

### `qr-payload` (`@/packages/qr-payload`)

- **Purpose**: Consolidated QR payload generation, hydration parsing, RFC 5545/6350 escaping, protocol identification, and security containment validation behind a stateless format/parse/validate seam.
- **Entry Points**:
  - `index.ts`: Polymorphic `formatPayload`, `parsePayload`, `validatePayload`, config validators `validateConfig` and `sanitizeConfig`, protocol parser `identifyProtocol`, `canHydrate`, RFC escaping helpers, and typed generator contracts (`WifiContract`, `EmailContract`, `VCardContract`, etc.).

### `optical-transfer` (`@/packages/optical-transfer`)

- **Purpose**: Air-gapped, one-way optical data transmission via animated QR code streams. Uses a pure TypeScript rateless fountain codec (Luby Transform over $\text{GF}(2)$ with peeling plus Gaussian-elimination fallback) framed as BC-UR `ur:bytes/` parts (CBOR + Bytewords + CRC-32), `deflate-raw` pre-compression, a SHA-256-verified session header, recycled preallocated frame pools, stream lookahead sanitization, and dedicated Web Workers. See [ADR 0014](../../docs/adr/0014-rateless-fountain-codes-for-airgapped-optical-transfer.md).
- **Entry Points**:
  - `index.ts`: Primary public API: the handshake scannability gate (`verifyHandshakeFrame` with injectable worker/checker factories), `PreallocatedFramePool`, `StreamLookaheadReceiver`, fountain codec primitives (`FountainEncoder`, `FountainDecoder`, `solveGF2`, Robust Soliton helpers), BC-UR envelope (`serializeDroplet`, `parseDropletString`, `cborEncode`/`cborDecode`, Bytewords, `crc32`), session layer (`createFountainSession`, `openFountainSession`, `compressForTransfer`, `resolveFountainSymbolSize`), `FountainReassembler`, `FountainRateTracker`, and contracts.
  - `client.ts`: Headless React hooks. `useOpticalSender` broadcasts fountain droplets by default, with no handshake frame and every QR at version 7 or lower; the caller injects `renderFrame` and the scannability fallback flag. `useOpticalReceiver` provides stateless entry and exposes `fountainStats` telemetry (droplets vs K, rank, FPS, ETA); the caller injects `camera` and `saveFile`. Also exports UI state types.
  - `worker-slice.ts`: Background Web Worker: hashing, `deflate-raw` compression (skipped when it saves less than 5%), density-bounded symbol sizing, and QR matrix generation for droplets or legacy chunks.
  - `worker-reassembly.ts`: Background Web Worker: fountain reassembly (peeling + GF(2) elimination), decompression and SHA-256 verification, plus legacy chunk reassembly.

### `edge-redirect` (`@/packages/edge-redirect`)

- **Purpose**: Both sides of Zero-Knowledge Redirection. Server side: the hardened `/api/redirect/*` API (ciphertext-only destinations, Turnstile failing closed, Rate Limiting bindings, origin allowlist, body caps) and the `/r/<id>` resolver routing, backed by Cloudflare D1. Not enabled in production yet; see `docs/public/EDGE_ARCHITECTURE.md`.
- **Entry Points**:
  - `index.ts`: `handleRedirectApi`, `routeEdgeRequest`, `RESOLVER_SHELL_PATH`, `MemoryRateLimiter`, `verifyTurnstileWithSiteverify`, limits and binding types.
  - `client.ts`: Browser side: AES-GCM destination encryption with the key kept in the `#key=...` anchor (`generateDecryptionKey`, `encryptUrl`, `decryptUrl`, `isEncrypted`, `extractKeyFromHash`) and the `useRedirector` hook that registers, updates and lists records under the approved `qrcraftly:dynamic-redirects` storage key. The Worker entries never import React; the server shares only the private `isEncrypted` check.
  - `worker.ts`: Cloudflare Worker entry (`main` in `wrangler.jsonc` once enabled); falls through to the `ASSETS` binding.
  - `dev.ts`: Vite dev middleware and in-memory `MockD1Database` so `pnpm dev` works without Cloudflare credentials.
  - `schema.sql`: D1 schema applied with `pnpm exec wrangler d1 execute`.
