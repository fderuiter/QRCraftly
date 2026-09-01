# 1. Client-Side Only QR Generation and Storage Allowlist

## Context

QR code payloads frequently contain sensitive personal data, such as Wi-Fi network passwords, vCard contact information, healthcare/medical URLs, and cryptocurrency credentials. Transmitting these payloads across external networks or persisting them indefinitely in browser storage presents severe privacy risks and regulatory compliance liabilities (including HIPAA and GDPR).

## Decision

We require all core QR code generation, canvas matrix rendering, and scannability evaluation to execute 100% client-side in volatile browser memory. Persistent browser storage (`localStorage`, `sessionStorage`, `IndexedDB`) is prohibited for user payloads and restricted via an AST build auditor (`scripts/storage_privacy_ast_auditor.js`) to an explicit allowlist of non-sensitive preference keys (`qr-telemetry-opt-in`, `qrcraftly:dynamic-redirects`, `qrcraftly:dynamic-consent-accepted`, `__test__`).

## Consequences

- User data never traverses the network during generation, ensuring strict compliance with zero-trust privacy guarantees.
- Zero server storage infrastructure or backend database liability for standard QR codes.
- Batch generation or server-side headless generation cannot be supported without client-side rendering capabilities.
- Any attempt to introduce unapproved persistent keys fails automated build checks closed.
