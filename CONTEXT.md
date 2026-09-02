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

### Environment & Tooling Invariants

**Platform Invariance Guarantee**:
The invariant ensuring all repository tooling, scripts, file operations, build pipelines, and tests behave identically across Windows, macOS, and Linux without platform branching or host-specific path assumptions.
_Avoid_: OS compatibility, multi-platform fix, Windows support, cross-platform patch

**Path Canonicalization**:
The internal representation of all relative filesystem paths using POSIX forward slashes (`/`) regardless of host operating system path conventions.
_Avoid_: Path slash replacement, Windows path normalization, slash sanitization, backslash cleanup

### Architectural Structure

**Deep Module**:
A cohesive software unit that encapsulates substantial behavior and implementation complexity behind a small, well-defined public surface situated at the package root. Distinct from a binary QR matrix module.
_Avoid_: Unit, component, service, utility folder, barrel package

**Entry-Point Seam**:
The explicit interface boundary formed by a package's root-level files through which all external consumers and tests interact with the module.
_Avoid_: Internal import, deep path import, barrel file, boundary

### Developer Experience & Tooling

**Interactive Wizard**:
A guided terminal walkthrough script that coordinates manual human browser actions, credential capture, and environment configuration through a standardized stage-by-stage interface.
_Avoid_: Setup helper, interactive guide, prompt script, install cli

**Wizard Runner**:
A cross-platform launcher ensuring interactive bash wizards execute consistently across Windows, macOS, and Linux without platform branching or manual shell navigation.
_Avoid_: Bash bridge, script invoker, shell wrapper
