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

**Diagonal Neck Bridge**:
A calibrated diagonal corridor connecting diagonally adjacent modules across 2x2 matrix intersections in fluid rendering.
_Avoid_: Diagonal bleed, corner bleed, diagonal connector

**Perimeter Contour Loop**:
A closed polygon formed by directed boundary segments outlining contiguous module clusters for smooth vector rendering.
_Avoid_: Outline, border path, trace line

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

**Print Simulation Verified**:
The optimal scannability grade indicating optical clarity under simulated physical print conditions and localized contrast audits.
_Avoid_: Physical-Ready, print pass, physical scan ok

**Screen Scan Verified**:
A passing scannability grade indicating reliable digital screen readability with an advisory to verify physical prints prior to mass distribution.
_Avoid_: Digital-Only Pass, screen pass, digital ok

**Scan Verification Failed**:
A degraded scannability grade indicating the QR matrix cannot be reliably resolved due to contrast or complexity violations.
_Avoid_: Low Scannability, bad scan, scan fail

**Worker Degradation Cache**:
A client-side state flag indicating that background Web Worker execution lacks OffscreenCanvas 2D rendering capabilities in the current browser environment, routing subsequent scannability evaluations to direct zero-copy ImageData buffer transfers without retry overhead.
_Avoid_: Canvas fallback flag, broken worker cache, degradation state

**Superseded ACK**:
An off-thread Web Worker acknowledgement confirming a stale scan frame was dropped, used by the main-thread scheduler to release backpressure without overwriting active diagnostic status.
_Avoid_: Stale frame response, dropped signal, busy unlock event

### Air-Gapped Optical Transfer

**Air-Gapped Optical Transfer**:
A client-side screen-to-camera communication pipeline transmitting arbitrary files across physical air gaps via animated QR code streams without local network or Bluetooth dependencies.
_Avoid_: Dynamic QR transfer, animated scanner, QR streaming file

**Asynchronous Optical Erasure Channel**:
The physical-layer model of the screen-to-camera optical link where camera rolling shutter, ambient reflections, and uncoordinated display refresh rates turn transmission defects into packet erasures.
_Avoid_: Bad camera link, scan drop channel, broken scan link

**Rateless Fountain Stream**:
A continuous broadcast of pseudo-randomly combined droplet frames encoded using Luby Transform codes, allowing any receiver to reconstruct the source payload from any K + ε frames regardless of arrival order.
_Avoid_: Shuffled loop, infinite carousel, frame deck

**Two-Tier Optical Error Correction**:
A dual-layer error mitigation scheme combining intra-frame Reed-Solomon codewords over GF(2^8) to correct localized spatial blemishes with inter-frame rateless fountain coding over GF(2) to absorb temporal frame drops.
_Avoid_: Double ECC, dual error recovery, two-way ECC

**Stateless Stream Entry**:
The receiver capability to start capturing and decoding an optical stream at an arbitrary point in time without an explicit preparatory handshake phase.
_Avoid_: Mid-stream scan, instant sync, handshake-free mode

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

**Git Guardrails**:
The automated client-side hooks combining Husky with lint-staged to enforce code formatting, syntax rules, and duplication constraints before commit creation.
_Avoid_: Commit hooks, git checks, pre-commit scripts, git filters

**Authoritative Deployment Orchestrator**:
The single source of truth (GitHub Actions) executing quality gates, security audits, build provenance attestations, and edge deployments, preventing duplicate or unverified builds from external git integrations.
_Avoid_: Build trigger, dual deploy, cloud build runner, auto-deployment app

**Staged Promotion**:
The lifecycle discipline where all feature and fix branches merge into the default integration branch (`dev`), deploying to an active preview environment (`qrcraftly.fpderuiter.workers.dev`) before production release promotion to `main`.
_Avoid_: Dev-to-main copy, branch sync, direct push release, cherry-pick release

**Ephemeral Preview Environment**:
An isolated, on-demand edge staging deployment created per pull request to enable automated end-to-end smoke verification and visual review prior to merge.
_Avoid_: Test deploy, PR sandbox, temp site, branch build
