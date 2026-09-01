# QRCraftly

A client-side, privacy-first QR code generation suite with zero-knowledge dynamic edge redirection and off-thread scannability analysis.

## Language

### QR Geometry & Rendering

**Matrix**:
The two-dimensional grid of binary square modules representing encoded data, error correction codewords, and timing/alignment patterns.
_Avoid_: Grid, table, bitmap

**Module**:
An individual binary dark or light data cell situated at coordinate (x, y) within the QR matrix.
_Avoid_: Pixel, dot, block, unit

**Pattern Module**:
A user-selectable styling preset that determines the visual geometric render algorithm (such as standard squares, rounded rectangles, fluid ink droplets, or circles) used to draw dark modules.
_Avoid_: Style preset, theme, dot shape, skin

**Finder Pattern**:
One of the three 7x7 concentric square detection eyes positioned at the top-left, top-right, and bottom-left corners of the QR matrix used by barcode scanners to locate and orient the code.
_Avoid_: Corner eye, alignment marker, target, anchor box

**Quiet Zone**:
The mandatory blank, unprinted margin of at least four modules wide surrounding the exterior perimeter of the QR matrix required for optical detection.
_Avoid_: Margin, padding, border, white space

**Fluid Ink**:
A dynamic visual render style where adjacent dark modules merge with smooth bezier curves and fluid droplet bridges while preserving module readability.
_Avoid_: Liquid ink, blob style, melted QR, connected dots

**Scannability Health**:
An empirical optical scan score and safety classification (High, Medium, Low, Critical) derived from background jsQR decoding passes and module contrast audits.
_Avoid_: Readability rate, success score, scan rating, reliability index

### Privacy & Compliance

**Zero-Knowledge Redirection**:
A dynamic URL routing mechanism where target destination payloads are encrypted client-side, with the decryption key isolated exclusively in the URL anchor hash fragment (`#key=...`) and never sent to edge servers.
_Avoid_: Private redirect, secure forwarding, server-side masking

**Anchor Hash Fragment**:
The URI component following `#` containing client-held cryptographic parameters that browsers never transmit across HTTP request headers.
_Avoid_: Hash tag, URL parameter, query fragment, bookmark

**Storage Allowlist**:
The strict AST-audited set of persistent browser storage keys (`localStorage`, `sessionStorage`, `IndexedDB`) permitted to exist in the application.
_Avoid_: Storage whitelist, cookie list, saved state keys

**Volatile Memory Guarantee**:
The architectural invariant guaranteeing that user payloads, contact details, and generated matrix data reside purely in transient browser memory and are discarded immediately upon navigation or reset.
_Avoid_: Stateless mode, incognito processing, memory wipe

### Off-Thread Compute & Performance

**Scannability Worker**:
A dedicated background Web Worker executing off-thread relative luminance contrast audits and dual-pass orientation decoding without blocking main-thread UI frames.
_Avoid_: Background scanner, validation thread, scannability thread

**DoubleBufferPool**:
A pre-allocated pool of zero-copy transferable `ArrayBuffer` instances swapped between the main UI thread and background workers to eliminate garbage collection pauses.
_Avoid_: Memory cache, buffer array, frame queue

**SvgContext**:
A client-side vector graphics rendering engine implementing Canvas 2D context drawing commands directly into resolution-independent SVG XML markup.
_Avoid_: Canvas-to-SVG converter, vector exporter, SVG renderer
