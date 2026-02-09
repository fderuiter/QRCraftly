## 2024-03-24 - Protocol Normalization
**Vulnerability:** Simple protocol checks (like `.startsWith('javascript:')`) can be bypassed using control characters or whitespace (e.g., `j a v a s c r i p t :` or `\njavascript:`).
**Learning:** Browser URL parsers often strip whitespace and control characters before processing the scheme, meaning a "safe" string to a regex might still execute code.
**Prevention:** Always normalize inputs by stripping all whitespace and control characters before validating the protocol scheme.

## 2025-02-18 - CSP Meta Tag Limitations
**Discovery:** Content Security Policy (CSP) delivered via `<meta>` tag ignores the `frame-ancestors` directive.
**Learning:** `frame-ancestors` must be delivered via HTTP headers to be effective against Clickjacking. Using it in a meta tag provides false security.
**Prevention:** Do not rely on `<meta>` tags for Clickjacking protection. Use HTTP headers or legacy frame-busting scripts if headers are not controllable (e.g. static hosting without header config).

## 2025-02-18 - SMS URI Injection
**Vulnerability:** The deprecated `smsto:` scheme was used without encoding the message body, allowing injection of delimiters (like `:`) to potentially alter the target number or break the URI.
**Learning:** `smsto:` does not have a standard way to encode bodies. The standard `sms:` scheme supports `?body=` with URL-encoded values.
**Prevention:** Use standard URI schemes (RFC 5724 for SMS) and always `encodeURIComponent` user-supplied data in URI parameters.

## 2026-02-08 - Unicode Bypass in URL Validation
**Vulnerability:** `isDangerousUrl` stripped ASCII control characters but failed to handle Unicode zero-width characters (e.g., `\u200B`), allowing `jav\u200Bascript:` to bypass the check while potentially executing in browsers.
**Learning:** Standard regex character classes like `\s` or ranges `\x00-\x1F` are insufficient for security sanitization in a global context. Unicode Property Escapes (`\p{C}`, `\p{Z}`) are essential for robustly matching invisible characters.
**Prevention:** Use `const CONTROL_CHARS_REGEX = /[\p{C}\p{Z}]+/gu;` to strip all control, format, and separator characters when normalizing strings for security checks.
