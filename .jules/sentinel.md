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

## 2026-02-07 - Invisible Character Filter Bypass
**Vulnerability:** Input validation filters using standard regex whitespace (`\s`) can be bypassed using invisible Unicode characters like Zero Width Space (`\u200B`), which are ignored by some URL parsers but not matched by `\s`.
**Learning:** `\s` in JavaScript RegExp does not include all invisible Unicode characters. Attackers can interleave `\u200B` into dangerous protocols (e.g., `java\u200Bscript:`) to evade detection while still executing in lenient contexts.
**Prevention:** Explicitly strip a broader range of control and format characters (including `\u200B-\u200D`, `\uFEFF`) during input normalization before security checks.

## 2026-05-12 - Obscure Dangerous Protocols
**Vulnerability:** Blocking only common XSS vectors (`javascript:`, `data:`, `file:`) leaves gaps for obscure or browser-specific protocols like `blob:`, `filesystem:`, or legacy scripting schemes (`jscript:`, `mocha:`).
**Learning:** Attackers can utilize generated `blob:` URLs or legacy IE protocols to execute code or spoof content if the validation allowlist is too permissive or the blocklist is too narrow.
**Prevention:** Maintain a comprehensive blocklist of dangerous protocols, including `blob:`, `filesystem:`, and legacy scripting schemes, to practice defense-in-depth against protocol handler abuse.

## 2025-02-18 - Phone Number Sanitization Gap
**Vulnerability:** The  function used a blacklist approach (removing only spaces and specific chars), allowing injection of letters and script tags into `tel:` and `sms:` URIs.
**Learning:** Blacklists are prone to incompleteness. A previous memory claimed strict whitelisting was in place, but the code did not reflect this, leading to a false sense of security.
**Prevention:** Implement strict whitelisting (`/[^0-9+*#\-().]/g`) for phone numbers and verify implementation against security claims in documentation/memory.

## 2025-02-18 - Phone Number Sanitization Gap
**Vulnerability:** The `cleanPhoneNumber` function used a blacklist approach (removing only spaces and specific chars), allowing injection of letters and script tags into `tel:` and `sms:` URIs.
**Learning:** Blacklists are prone to incompleteness. A previous memory claimed strict whitelisting was in place, but the code did not reflect this, leading to a false sense of security.
**Prevention:** Implement strict whitelisting (`/[^0-9+*#\-().]/g`) for phone numbers and verify implementation against security claims in documentation/memory.

## 2026-05-25 - WiFi QR Code Malformation
**Vulnerability:** WiFi configuration strings (MECARD-like format) can be broken or exploited by injecting non-printable control characters (like newlines or null bytes) into the SSID or password fields, which were not being stripped.
**Learning:** While `WIFI:` URI schemes are generally parsed as text, some parsers (especially in embedded devices or mobile OS) may have undefined behavior when encountering control characters like `\0` or `\n` within fields, potentially leading to denial of service or configuration injection.
**Prevention:** Strictly sanitize WiFi credentials by stripping all non-printable control characters (0x00-0x1F, 0x7F-0x9F) before constructing the QR payload.
