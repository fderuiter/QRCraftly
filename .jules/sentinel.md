# Sentinel's Journal

## 2025-02-18 - Crypto Payment URI Injection
**Vulnerability:** Parameter injection in cryptocurrency payment URIs (BIP-21) via the `address` field.
**Learning:** Generic sanitization functions (like `sanitizeInput` which strips control chars and `?`) may overlook context-specific delimiters. In this case, `&` was left in the address, allowing an attacker to inject additional query parameters (e.g., `&amount=...`) into the generated URI.
**Prevention:** Sanitize inputs based on the specific context and format required. For crypto addresses, strictly whitelist allowed characters (alphanumeric) or explicitly strip all URI delimiters (`?`, `&`, `=`, etc.) before construction.
