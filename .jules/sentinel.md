## 2024-03-24 - Protocol Normalization
**Vulnerability:** Simple protocol checks (like `.startsWith('javascript:')`) can be bypassed using control characters or whitespace (e.g., `j a v a s c r i p t :` or `\njavascript:`).
**Learning:** Browser URL parsers often strip whitespace and control characters before processing the scheme, meaning a "safe" string to a regex might still execute code.
**Prevention:** Always normalize inputs by stripping all whitespace and control characters before validating the protocol scheme.

## 2024-10-27 - SMS URI Injection
**Vulnerability:** Constructing SMS URIs using string concatenation (`smsto:number:message`) allows users to break the format or inject content if the message contains delimiters.
**Learning:** Legacy schemes like `smsto:` rely on positional arguments and lack standard encoding support, making them brittle and insecure for arbitrary input.
**Prevention:** Prefer standard URI schemes (like `sms:`) that support URL-encoded parameters (`?body=...`) to safely encapsulate user input.
