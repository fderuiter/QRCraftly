---
status: accepted
---

# Consolidated Optical Detection Engine

## Context

Optical barcode scanning from real-time webcam streams, uploaded image files, and video recordings previously suffered from architectural fragmentation and shallowness. The scanning pipeline was split across `src/hooks/useAdaptiveScanner.ts` (since deleted), `src/utils/FrameProvider.ts` (since deleted), `src/utils/AdaptiveFrameScheduler.ts` (since deleted), and `src/utils/scannerWorker.ts` (since deleted).

This fragmentation caused several acute maintenance and reliability challenges:

1. **Plumbing Duplication**: `CameraFrameProvider` in `FrameProvider.ts` duplicated over 250 lines of camera frame acquisition, dimension scaling, worker `postMessage` transfers, and watchdog recovery already implemented in `useAdaptiveScanner.ts`. It was unused by any UI component and only tested in isolation.
2. **Leaky Machinery & Dual Abstractions**: [`src/components/QRScanner.tsx`](../../src/components/QRScanner.tsx) was forced to straddle two disparate abstractions: `useAdaptiveScanner` for webcam video streams and `FileFrameProvider` for file drag-and-drop. Internal machinery—such as `DoubleBufferPool`, raw worker message payloads, and watchdog recreation loops—was exposed across consumer boundaries.
3. **Worker Recovery Hot Spots**: Fixes for worker stalls, starvation watchdogs (1500ms timeout), and message error boundaries had to be applied redundantly across multiple files, increasing the risk of behavioral divergence.
4. **Code Duplication Limits**: The duplicated frame-sampling and video-stepping loops threatened the repository clone threshold ceiling of 3.0% (`.jscpd.json`).

## Decision

We consolidate the entire optical detection pipeline into a unified deep module under [`src/packages/optical-scanner/`](../../src/packages/optical-scanner/).

### 1. Unified Entry-Point Seams

The package exposes minimal, orthogonal public seams:

- **`index.ts` (Headless Entry Point)**: Exposes polymorphic `scan(source, options)` supporting `ImageData`, `HTMLCanvasElement`, `ImageBitmap`, and `File`/`Blob` (static images and WebM/MKV video files), alongside public type definitions and runtime validation contracts.
- **`index.ts` also exposes the Camera Scanner Engine** (`createCameraScannerEngine`): the headless owner of the camera frame loop, adaptive sampling, backpressure, downscaling, worker epochs, the hang watchdog, worker restarts and main-thread fallback (see sections 4 and 5).
- **`client.ts` (React Hook Seam)**: Exposes `useQrScanner`, a thin React adapter over the Camera Scanner Engine that creates it lazily, keeps its sampling bounds in sync, batches its events into React state, destroys it on unmount, and provides a unified `scanFile(file)` method. It does not expose the worker.
- **`worker.ts` (Web Worker Seam)**: The dedicated off-thread Web Worker entry point consolidating WebCodecs video demuxing, EBML parsing, and pure JavaScript jsQR optical decoding (`attemptBoth`).

### 2. Private Internal Subsystem (`lib/`)

All complex internal mechanics are strictly hidden inside `lib/` and are inaccessible to outside callers:

- **`lib/sourceExtractor.ts`**: Unified extraction pipeline for all `ScanSource` types. Handles native HTML5 video frame stepping (24 FPS), WASM WebM demuxer fallback, global file concurrency locking, and client-side telemetry dispatches.
- **`lib/scheduler.ts`**: `AdaptiveFrameScheduler` managing in-flight frame tracking, round-trip execution latency histories, dynamic sleep interval pacing, and immediate 1500ms starvation watchdog triggers.
- **`lib/bufferPool.ts`**: `DoubleBufferPool` managing transferable zero-copy `ArrayBuffer` instances to prevent runtime garbage collection pauses.
- **`lib/cameraEngine.ts`**: The Camera Scanner Engine (section 4).
- **`lib/clock.ts`**: Injectable `ScannerClock` used by the engine and the scheduler.
- **`lib/workerRunner.ts`**: Lazy singleton worker instantiation (private to the package), the default engine worker factory, listener boundary management, watchdog recovery for file scans, and thread teardown.
- **`lib/contracts.ts`**: Strict TypeScript runtime validation contracts, type assertion guards, and dimension downscaling math.

### 3. Deletion of Dead Machinery & Legacy Shims

- Deleted `src/utils/scannerWorker.ts` in favor of `src/packages/optical-scanner/worker.ts`.
- Converted legacy utility files (`useAdaptiveScanner.ts`, `AdaptiveFrameScheduler.ts`, `scannerContract.ts`) into minimal, single-line backwards-compatibility re-export shims. The `sharedScannerWorker.ts` shim (`terminateSharedScannerWorker` alias) was later deleted; the canonical `terminateScannerWorker` is imported from `scheduler.ts`. The `useAdaptiveScanner` alias shim was also deleted (issue #982): callers import `useQrScanner` from `@/packages/optical-scanner/client`.

### 4. Camera Scanner Engine and Sealed Worker Seam (amendment, issue #920)

The camera hook originally mixed worker lifecycle, watchdog recovery, adaptive scheduling, canvas fallback and render batching (`useWorkerRecovery`, `useVideoBinding`, `useBatchScannerState`) and leaked `workerRef` through its public result. These are now consolidated into one headless engine:

- **Interface**: `createCameraScannerEngine({ getSource, minSamplingDelay, maxSamplingDelay })` returns `start`, `stop`, `destroy`, `setOptions`, `getMetrics` and `subscribe(events)` with typed `onScanSuccess`, `onScanFail`, `onStatusChange` (`idle | checking | pass | fail`) and `onMetricsChange` (`samplingDelay`, `latencyHistory`) listeners.
- **Sealed worker**: the worker handle, epoch counter, message listeners and termination are private to the engine. Messages from a replaced worker generation or an earlier session are discarded by epoch.
- **Recovery policy** (superseded by section 5): a frame in flight longer than the watchdog budget (1500ms) or a worker `error`/`messageerror` recreated the worker with a doubled budget (3000ms, then capped at 6000ms). Any valid, non-stale worker answer reset the counter and budget. After three consecutive restarts fail, or when the worker factory throws, the engine decodes on the main thread (frames capped at 800px) without changing its interface.
- **Dependency injection instead of test hooks**: the worker factory (`ScannerWorkerFactory`), clock (`ScannerClock`), frame grabber and main-thread decoder are injectable. The package no longer attaches `terminateSharedScannerWorker`/`resetSharedScannerWorker` to `globalThis`, and the camera path no longer switches to synchronous state updates under test.
- **Tests**: [`src/packages/optical-scanner/tests/cameraScannerEngine.test.ts`](../../src/packages/optical-scanner/tests/cameraScannerEngine.test.ts) drives the engine headlessly (node environment, fake frame source, fake workers, fake clock). [`src/packages/optical-scanner/tests/useQrScanner.test.tsx`](../../src/packages/optical-scanner/tests/useQrScanner.test.tsx) is a small adapter smoke test.
- **Duplicated frame provider**: the standalone `FrameProvider.ts` camera loop was already deleted (section 3); the engine is now the only camera frame loop.

### 5. Per-Session Staleness, Bounded Decodes and Hang-Only Watchdog (amendment, issues #1095 and #1096)

Measured with the scanner test harness (#1103), the engine got slower exactly when scanning was hardest:

- **Staleness is per scan session.** The shared worker kept one module-wide `latestSequenceId`, while every session numbers its frames from 1, so a scanner reopened after a long session had its frames answered `STALE_FRAME` for seconds. Epochs are now unique across the page (one counter for every engine and worker generation), and the worker judges staleness per `(epochId, sequenceId)` (`lib/frameGuard.ts`). Within a session, older frames are still rejected.
- **One bounded jsQR pass per camera frame.** `decodeCameraFrame` (`lib/decodeSync.ts`) runs a single pass and consecutive frames rotate strategies: the native-resolution centre square, the whole frame downscaled to 800px, and an inverted pass (jsQR 1.4's `onlyInvert` is broken, so the pixels are inverted first). Frames whose sensor noise exceeds a threshold are box-downscaled before the pass, because jsQR spends seconds on grainy frames. The multi-pass `decodeRgbaFrame` remains for one-shot image files. `pnpm run bench:scanner` measures both over the corpus.
- **Pacing converges.** The sampling delay targets 1.2x the 5-frame median latency, closing half the gap per frame when rising and dropping to the target at once when decodes speed up. The old rule added 50ms on every slow frame and reached the 1000ms maximum (about 1 fps).
- **The watchdog catches hangs only.** One 5000ms budget, measured from the worker's last answer, replaces the 1500ms / 3000ms / 6000ms backoff. A slow but answering worker is never restarted; after three consecutive hangs or crashes the engine still falls back to the main thread, where it runs the same one-pass rotation.

## Rationale

- **Deep Module Principle**: Encapsulating high internal complexity (Web Workers, transferable buffers, canvas contexts, adaptive frame pacing, and demuxing) behind narrow public entry points (`scan`, `useQrScanner`) simplifies callers and eliminates abstraction leaks.
- **Single Test Surface**: Consolidating file and camera decoding into one module provides a unified test surface ([`tests/opticalScannerIntegration.test.tsx`](../../tests/opticalScannerIntegration.test.tsx) and [`src/packages/optical-scanner/tests/opticalScanner.test.tsx`](../../src/packages/optical-scanner/tests/opticalScanner.test.tsx)).
- **Duplication Reduction**: Deleting `FrameProvider.ts` dropped repository-wide code duplication to **2.40%**, well beneath the 3.00% invariant limit.

## Consequences

- [`src/components/QRScanner.tsx`](../../src/components/QRScanner.tsx) uses a single hook (`useQrScanner`) for both live camera feeds and file drag-and-drop (`scanFile`).
- Removing `workerRef` from `UseQrScannerResult` is a breaking change for direct readers of that property; no UI component read it.
- Zero dependency violations reported by `depcruise src` across all 388 modules.
- Complete backwards compatibility preserved for existing test harnesses and subpages via minimal re-export shims.
- All 193 test suites (1,910 tests) and Playwright E2E suites pass with zero regressions.
