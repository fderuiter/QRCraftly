# QRCraftly

A client-side QR code studio and zero-knowledge dynamic edge routing platform designed to generate customized, scannable QR codes without transmitting user payloads across the network.

## Language

### QR Geometry

**Matrix**:
The two-dimensional grid of binary square modules representing encoded data, error correction codewords, and timing patterns.
_Avoid_: Grid, table, bitmap

**Module**:
An individual binary data cell situated at coordinate (x, y) within the QR matrix.
_Avoid_: Pixel, dot, block, unit

**Finder Pattern**:
The three concentric square detection eyes positioned at the corners of the QR matrix used by barcode scanners for orientation.
_Avoid_: Corner eye, alignment marker, target, anchor box

**Quiet Zone**:
The blank, unprinted margin of at least four modules wide surrounding the exterior perimeter of the QR matrix required for optical detection.
_Avoid_: Margin, padding, border, white space

**Fluid Ink**:
A visual render aesthetic where contiguous dark modules connect via continuous curves while preserving module optical contrast.
_Avoid_: Liquid ink, blob style, melted QR, connected dots

### Privacy & Compliance

**Zero-Knowledge Redirection**:
A dynamic routing architecture where target destinations are encrypted client-side and the decryption key resides only in the client anchor hash fragment.
_Avoid_: Private redirect, secure forwarding, server-side masking

**Storage Allowlist**:
The explicit set of persistent browser storage keys permitted in client memory.
_Avoid_: Storage whitelist, cookie list, saved state keys

**Volatile Memory Guarantee**:
The privacy invariant ensuring user payloads reside exclusively in ephemeral browser memory and clear upon session end.
_Avoid_: Stateless mode, incognito processing, memory wipe

### Off-Thread Performance

**Scannability Health**:
An empirical classification of code readability derived from automated contrast checks and barcode detector evaluation.
_Avoid_: Readability rate, success score, scan rating, reliability index

**Scannability Worker**:
A dedicated background process performing real-time contrast auditing and optical decoding off the main user interface thread.
_Avoid_: Background scanner, validation thread, scannability thread
