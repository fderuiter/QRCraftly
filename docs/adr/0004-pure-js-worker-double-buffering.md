---
status: accepted
---

# Pure JavaScript Web Workers and Double-Buffered Memory Pooling

## Context

Evaluating QR scannability in real time requires continuous pixel extraction, contrast audits, and full decode passes. Executing this on the main UI thread causes frame drops and input lag, while compiling WebAssembly decoders introduces network bundle bloat and instantiation delay.

## Decision

We run scannability analysis off the main thread in dedicated Web Workers (`scannabilityWorker.ts`, `scannerWorker.ts`) using a pure JavaScript engine (`jsQR`) combined with transferable, zero-copy `ArrayBuffer` instances managed by a pre-allocated `DoubleBufferPool`.

## Rationale

Off-thread execution preserves a fluid 60 FPS main thread during rapid user input. Recycling pre-allocated memory buffers via transferable objects eliminates runtime garbage collection pauses without the cold-start overhead of WebAssembly.

## Consequences

- Responsive UI frame rendering during live customization on all supported hardware.
- Zero WebAssembly download or compilation requirement.
- Environments where Web Workers are blocked fall back to cooperative main-thread yielding (`requestIdleCallback`/`setTimeout`).
