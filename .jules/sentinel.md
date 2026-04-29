## 2025-05-24 - [PostCSS XSS Vulnerability Fix]
**Vulnerability:** Dependency (PostCSS) vulnerable to XSS via Unescaped </style> in its CSS Stringify Output.
**Learning:** Outdated dependencies with known vulnerabilities should be updated as part of routine maintenance.
**Prevention:** Regularly run `pnpm audit` and update dependencies to their patched versions.
