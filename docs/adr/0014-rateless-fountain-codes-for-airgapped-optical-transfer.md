# Rateless Fountain Codes and Multi-Tier Scanning for Air-Gapped Optical Transfer

## Context

Screen-to-camera optical communication (SCC) models the air gap between an electronic display and a camera sensor as an asynchronous packet erasure channel subject to rolling shutter tearing, unsynchronized refresh clocks, ambient reflections, and optical blur. The existing naive carouselled chunking protocol suffers from the coupon collector problem ($O(N \ln N)$ frame latency) and stalls completely whenever the initial handshake frame is dropped or missed.

## Decision

We adopt unidirectional rateless fountain codes (conforming to the Blockchain Commons Uniform Resources / BC-UR standard using Luby Transform codes over $\text{GF}(2)$) and a multi-tier optical detection engine (hardware `BarcodeDetector` API with WASM and `jsQR` fallbacks) for all air-gapped file transfers. Payloads are transparently compressed via native `CompressionStream` (Gzip/Deflate) prior to fountain block slicing, and stream metadata is self-describing within droplet envelopes to enable stateless stream entry at any point in time.

## Considered Options

- **Bidirectional Optical ARQ (`optical-data-bridge`)**: Rejected because simultaneous dual-camera screen alignment is ergonomically impractical for a single user transferring files between a phone and a laptop.
- **Carouselled Sequential/Shuffled Chunking with Handshake (Status Quo)**: Rejected due to severe coupon collector delays, unresolvable high-density QR modules, and handshake deadlock upon packet loss.
- **Unidirectional Rateless Fountain Codes (BC-UR)**: Selected because rateless droplets eliminate dropped-frame penalties, allow stateless stream entry, interoperate with the broader air-gapped hardware wallet ecosystem, and operate over standard unidirectional optical links.

## Consequences

- **Ergonomics & Reliability**: Transfers can begin immediately at any frame without an explicit handshake phase; dropping frames during camera autofocus or repositioning does not stall or reset progress.
- **Module Density & Scannability**: Pre-compression and smaller fountain symbol sizes lower the required QR version from Version 10+ down to Version 4–6 ($33 \times 33$ to $41 \times 41$ modules), keeping module dimensions well above the optical sensor Nyquist blur threshold.
- **Decoding Performance**: Offloading frame detection to the native `BarcodeDetector` API provides GPU-accelerated homography solving and $60\text{ fps}$ continuous tracking, falling back gracefully to WASM on unsupported browsers.
