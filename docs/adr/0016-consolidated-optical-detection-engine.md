---
status: accepted
---

# Consolidated Optical Detection Engine

## Context

Optical barcode scanning from real-time webcam streams, uploaded image files, and video recordings previously suffered from architectural fragmentation and shallowness. The scanning pipeline was split across [`src/hooks/useAdaptiveScanner.ts`](../../src/hooks/useAdaptiveScanner.ts), [`src/utils/FrameProvider.ts`](../../src/utils/FrameProvider.ts), [`src/utils/AdaptiveFrameScheduler.ts`](../../src/utils/AdaptiveFrameScheduler.ts), and [`src/utils/scannerWorker.ts`](../../src/utils/scannerWorker.ts).

This fragmentation caused several acute maintenance and reliability challenges:

1. **Plumbing Duplication**: `CameraFrameProvider` in `FrameProvider.ts` duplicated over 250 lines of camera frame acquisition, dimension scaling, worker `postMessage` transfers, and watchdog recovery already implemented in `useAdaptiveScanner.ts`. It was unused by any UI component and only tested in isolation.
2. **Leaky Machinery & Dual Abstractions**: [`src/components/QRScanner.tsx`](../../src/components/QRScanner.tsx) was forced to straddle two disparate abstractions: `useAdaptiveScanner` for webcam video streams and `FileFrameProvider` for file drag-and-drop. Internal machinery—such as `DoubleBufferPool`, raw worker message payloads, and watchdog recreation loops—was exposed across consumer boundaries.
3. **Worker Recovery Hot Spots**: Fixes for worker stalls, starvation watchdogs (1500ms timeout), and message error boundaries had to be applied redundantly across multiple files, increasing the risk of behavioral divergence.
4. **Code Duplication Limits**: The duplicated frame-sampling and video-stepping loops threatened the repository clone threshold ceiling of 3.0% (`.jscpd.json`).

## Decision

We consolidate the entire optical detection pipeline into a unified deep module under [`src/packages/optical-scanner/`](../../src/packages/optical-scanner/).

### 1. Unified Entry-Point Seams

The package exposes three minimal, orthogonal public seams:

- **`index.ts` (Headless Entry Point)**: Exposes polymorphic `scan(source, options)` supporting `ImageData`, `HTMLCanvasElement`, `ImageBitmap`, and `File`/`Blob` (static images and WebM/MKV video files). Also exports runtime validation contracts, downscaling math, and scheduler primitives for integration test harnesses.
- **`client.ts` (React Hook Seam)**: Exposes `useQrScanner`, a headless React hook that coordinates off-thread Web Worker QR code decoding on camera stream frames, manages dynamic backpressure-based sampling throttling (16ms–1000ms), handles video seeking/playback events, and provides a unified `scanFile(file)` method.
- **`worker.ts` (Web Worker Seam)**: The dedicated off-thread Web Worker entry point consolidating WebCodecs video demuxing, EBML parsing, and pure JavaScript jsQR optical decoding (`attemptBoth`).

### 2. Private Internal Subsystem (`lib/`)

All complex internal mechanics are strictly hidden inside `lib/` and are inaccessible to outside callers:

- **`lib/sourceExtractor.ts`**: Unified extraction pipeline for all `ScanSource` types. Handles native HTML5 video frame stepping (24 FPS), WASM WebM demuxer fallback, global file concurrency locking, and client-side telemetry dispatches.
- **`lib/scheduler.ts`**: `AdaptiveFrameScheduler` managing in-flight frame tracking, round-trip execution latency histories, dynamic sleep interval pacing, and immediate 1500ms starvation watchdog triggers.
- **`lib/bufferPool.ts`**: `DoubleBufferPool` managing transferable zero-copy `ArrayBuffer` instances to prevent runtime garbage collection pauses.
- **`lib/workerRunner.ts`**: Lazy singleton worker instantiation, listener boundary management, and thread teardown.
- **`lib/contracts.ts`**: Strict Zod schemas, type assertions, and dimension downscaling math.

### 3. Deletion of Dead Machinery & Legacy Shims

- Permanently deleted `src/utils/FrameProvider.ts` (retiring over 850 lines of duplicate camera and file provider machinery).
- Deleted `src/utils/scannerWorker.ts` in favor of `src/packages/optical-scanner/worker.ts`.
- Converted legacy utility files (`useAdaptiveScanner.ts`, `AdaptiveFrameScheduler.ts`, `scannerContract.ts`, `sharedScannerWorker.ts`) into minimal, single-line backwards-compatibility re-export shims.

## Rationale

- **Deep Module Principle**: Encapsulating high internal complexity (Web Workers, transferable buffers, canvas contexts, adaptive frame pacing, and demuxing) behind narrow public entry points (`scan`, `useQrScanner`) simplifies callers and eliminates abstraction leaks.
- **Single Test Surface**: Consolidating file and camera decoding into one module provides a unified test surface ([`tests/opticalScannerIntegration.test.tsx`](../../tests/opticalScannerIntegration.test.tsx) and [`src/packages/optical-scanner/tests/opticalScanner.test.tsx`](../../src/packages/optical-scanner/tests/opticalScanner.test.tsx)).
- **Duplication Reduction**: Deleting `FrameProvider.ts` dropped repository-wide code duplication to **2.40%**, well beneath the 3.00% invariant limit.

## Consequences

- [`src/components/QRScanner.tsx`](../../src/components/QRScanner.tsx) uses a single hook (`useQrScanner`) for both live camera feeds and file drag-and-drop (`scanFile`).
- Zero dependency violations reported by `depcruise src` across all 388 modules.
- Complete backwards compatibility preserved for existing test harnesses and subpages via minimal re-export shims.
- All 193 test suites (1,910 tests) and Playwright E2E suites pass with zero regressions.
