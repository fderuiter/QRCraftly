## 2025-05-24 - [PostCSS XSS Vulnerability Fix]
**Vulnerability:** Dependency (PostCSS) vulnerable to XSS via Unescaped </style> in its CSS Stringify Output.
**Learning:** Outdated dependencies with known vulnerabilities should be updated as part of routine maintenance.
**Prevention:** Regularly run `pnpm audit` and update dependencies to their patched versions.
## 2025-05-18 - Client-Side Image Upload Validation
**Vulnerability:** Lack of file size and type validation for local client-side image uploads before processing with `FileReader`. While not an immediate server-side risk, large files could freeze the browser tab (resource exhaustion) or malicious files could be inadvertently processed.
**Learning:** `FileReader.readAsDataURL` loads the entire file into a base64 string in memory. Without limits, users could upload multi-gigabyte files, crashing the application.
**Prevention:** Implement a `validateImageUpload` utility function (e.g., in `src/utils/security.ts`) that strictly checks `file.size` (e.g., 2MB limit) and `file.type` against a whitelist of allowed MIME types (JPEG, PNG, WebP, SVG) *before* passing the file to `FileReader`.
