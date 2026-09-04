---
status: accepted
---

# Consolidated Air-Gapped Optical Transfer Engine

## Context

Air-gapped screen-to-camera optical file transfer previously suffered from severe architectural entanglement across React hooks, utility workers, and ad-hoc frame memory caching. The sender and receiver subsystems were dispersed across [`src/hooks/useAnimatedQrSender.ts`](../../src/hooks/useAnimatedQrSender.ts) (748 lines), [`src/hooks/useAnimatedQrReceiver.ts`](../../src/hooks/useAnimatedQrReceiver.ts) (787 lines), [`src/utils/fileSliceWorker.ts`](../../src/utils/fileSliceWorker.ts), [`src/utils/fileReassemblyWorker.ts`](../../src/utils/fileReassemblyWorker.ts), [`src/utils/FrameMemoryPool.ts`](../../src/utils/FrameMemoryPool.ts), and [`src/engine/StreamLookahead.ts`](../../src/engine/StreamLookahead.ts).

This monolithic design presented multiple systemic deficiencies:

1. **Massive Hook Sprawl**: Over 1,500 lines of orchestration logic directly intertwined Web Worker messaging, RAF animation loops, frame memory pooling, video capture pipelines, and DOM side-effects inside React components.
2. **Untestable Off-DOM Logic**: Transfer protocols, handshake verification gates, and chunk reassembly could not be cleanly exercised in pure off-DOM unit tests without mocking DOM canvases, RAF loops, or media devices.
3. **Plumbing and Security Duplication**: `StreamLookahead.ts` duplicated URL percent-decoding, HTML entity resolution, and dangerous protocol filtering routines already implemented in `src/utils/url.ts`.
4. **ADR-0014 Alignment Gap**: The promise of rateless fountain codes (Luby Transform over $\text{GF}(2)$) and stateless stream entry (ADR 0014) remained blocked behind handshake-dependent carouselled chunking entangled within the presentation layer.
5. **Early Beta Designation**: The air-gapped optical transfer capability is experimental and requires clear user-facing early beta markers and advisory notices across navigation and transfer interfaces.

## Decision

We consolidate the entire air-gapped optical transfer pipeline into a unified deep module under [`src/packages/optical-transfer/`](../../src/packages/optical-transfer/).

### 1. Minimal Public Seams

The package exposes minimal, orthogonal public entry points:

- **`sender.ts` (Headless Sender Entry Point)**: Exposes `createTransferSession(file, options)` and `startTransfer(file, options)` for off-thread fountain/block slicing, contiguous frame caching, and rate-paced module frame stepping.
- **`receiver.ts` (Headless Receiver Entry Point)**: Exposes `createReceiverSession(options)` and `listenForStream(source, options)` managing off-thread droplet/chunk reassembly, stream lookahead security validation, and SHA-256 integrity verification.
- **`client.ts` (React Hook Seam)**: Exposes headless React hooks `useOpticalSender` and `useOpticalReceiver` to manage reactive lifecycle states, fps sliders, progress metrics, and canvas/video bindings without exposing internal memory buffers or workers.
- **`worker-slice.ts` & `worker-reassembly.ts` (Worker Entry Points)**: Dedicated off-thread Web Worker entry points isolating CPU-heavy slicing, fountain degree sampling, and peeling reassembly from the main thread.

### 2. Private Subsystem (`lib/`)

Internal transfer mechanics are strictly encapsulated within `lib/`:

- **`lib/fountain/`**: Zero-dependency Luby Transform codec implementing Robust Soliton degree distributions, droplet symbol generators, and peeling elimination reassembly for stateless stream entry.
- **`lib/chunking/`**: Backward-compatible sequential chunk partitioning and assembly for legacy stream parity.
- **`lib/framePool.ts`**: Contiguous typed-array memory buffer (`PreallocatedFramePool`) preventing GC pauses during animation loops.
- **`lib/streamLookahead.ts`**: Protocol security validator consuming `SafeUrlPipeline` from `src/utils/url.ts`, eliminating duplicate entity decoders.
- **`lib/handshake.ts`**: Initial handshake frame verification and scannability gatekeeping.

### 3. Backwards-Compatibility Shims & Duplication Limits

- Existing hooks (`src/hooks/useAnimatedQrSender.ts` and `src/hooks/useAnimatedQrReceiver.ts`) and utility workers (`src/utils/fileSliceWorker.ts`, `src/utils/fileReassemblyWorker.ts`, `src/utils/FrameMemoryPool.ts`, `src/engine/StreamLookahead.ts`) become minimal re-export shims pointing directly to `@/packages/optical-transfer`.
- Repository code duplication is preserved well below the 3.00% ceiling.

### 4. Early Beta Visibility

- Both `/file-transfer` and `/file-transfer/receive` display visual "Beta" pills in page headers.
- An advisory `Alert` banner is embedded to inform users of optical alignment and lighting constraints.
- Navigation links in `ProductShell.tsx` and `QRTool.tsx` carry an explicit "Beta" pill indicator.

## Consequences

- Presentation components (`src/pages/file-transfer/+Page.tsx` and `receive/+Page.tsx`) decouple entirely from Web Worker messaging, memory pooling, and protocol lookahead mechanics.
- Core streaming and fountain reassembly logic is 100% testable in headless Node/Vitest environments off the DOM.
- Eliminates 1,500+ lines of duplicated hook plumbing while preserving complete backward compatibility for existing routes.
