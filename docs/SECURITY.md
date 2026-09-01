# Security Policy

## CI/CD Security Governance

To protect against supply-chain attacks, this project enforces immutable dependency pinning for all CI/CD components.

- **Versioning Standard**: All third-party GitHub Actions must be pinned to specific, immutable SHA-1 hashes instead of mutable version tags (e.g., `@v4`). Each pinned hash must be accompanied by a human-readable comment specifying the original version tag (e.g., `# v4.1.0`) to maintain readability.
- **Automated Monitoring**: Dependabot is configured to check for updates to external CI/CD dependencies weekly to ensure workflows are running the latest security patches.
- **Remediation**: In the event a vulnerable action is identified or an automated update PR is generated, developers must review the PR, verify the hash corresponds to the legitimate version update, and merge the update immediately. Any new workflows introduced must adhere to this pinning standard.

## Privacy & Compliance

This application is designed with a "Privacy First" architecture. Please refer to [COMPLIANCE.md](public/COMPLIANCE.md) for detailed information on how this application handles data and aligns with regulations like HIPAA.

## Content Security Policy (CSP)

Our application utilizes a multi-layered Content Security Policy (CSP) enforced via both meta tags and HTTP response headers. To protect production deployments from script-injection (XSS) attacks, our build pipeline automatically parses compiled static HTML assets and computes SHA-256 integrity hashes for all inline scripts (such as JSON-LD structured blocks and framework hydration elements). Consequently, the `unsafe-inline` directive is completely absent from production deployments. In local development environments, a permissive fallback policy is utilized to allow unimpeded feature iteration.

## Reporting a Vulnerability

If you discover a security vulnerability or a privacy leak, please report it immediately.

### How to Report

Please use the [GitHub Security Advisory](https://github.com/fderuiter/QRCraftly/security/advisories/new) to report vulnerabilities directly to the maintainers. We will acknowledge your report within 48 hours.

### Scope

- **In Scope:**
  - Data leaks (e.g., data being sent to a server).
  - XSS vulnerabilities.
  - Improper configuration of the client-side generator.
- **Out of Scope:**
  - Physical security of the user's device.
  - Browser-level vulnerabilities.

## Phone Sanitization & Validation

To prevent injection of arbitrary characters or command payloads into telephone or SMS QR codes, the application runs strict sanitization routines entirely on the client side:

- **General Phone Validation**: By default, general telephone input values are cleaned to remove all non-numeric and non-standard telephone symbols. Characters like semicolons and commas are stripped.
- **SMS Multi-Recipient Isolation**: To support advanced client-side SMS campaign configurations, the SMS generator uses an isolated sanitization option that preserves semicolons and commas, while rejecting letters, other symbols, and line-break control characters.

## SVG Sanitization & Path Tracking

To prevent custom SVG logo uploads and native vector exports from exposing users to DOM-XSS and structural XML injection, QRCraftly incorporates two security controls:

- **Pre-Build Storage Privacy AST Auditor**: The build and pre-commit pipelines run static AST analysis (`scripts/storage_privacy_ast_auditor.js`) on source code before compilation. It scans for browser persistent storage operations (`localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `caches`) and enforces an explicit allowlist of authorized keys (`qr-telemetry-opt-in`, `qrcraftly:dynamic-redirects`, `qrcraftly:dynamic-consent-accepted`, `__test__`). Any attempts to persist transient QR payload data or use unapproved keys immediately abort the build.
- **Static Path Tracking**: The build pipeline and pre-commit checks automatically trace data flows across files. They detect and block any unvalidated path where raw/external SVG code might reach rendering/storage sinks without passing through `sanitizeSvg()`.
- **Runtime SVG Sanitization**: Uploaded logos and border images are processed entirely within the client browser to maintain offline privacy. The runtime parser enforces a zero-trust strict safe-element allowlist and zero-tolerance styling:
  - Discards any elements not present on a strict safe-element allowlist (such as `<foreignObject>`, `<embed>`, `<object>`, `<script>`, etc.).
  - Discards `<style>` blocks and element `style` attributes entirely if they contain any `@import` reference.
  - Limits nested data URIs to safe image MIME-types and strips any with active payload markers or script references. This is validated by an optimized, localized helper function within the security utility to ensure clean code and prevent unused export overhead.
  - Strips all inline event handlers (attributes starting with `on`).
  - Neutralizes any remote or dangerous resource requests inside style blocks, style attributes, or `href`/`xlink:href` references while preserving standard layout paths, responsive viewBox attributes, linear gradients, and clip paths.

## QR Animation Loops

Animation configuration structures in `types.ts` are strictly statically typed to prevent any runtime execution or script-injection pathways during high-frequency loop playbacks.

## Playable Maze Overlay

Maze overlay configurations in `types.ts` (e.g., `isMazeEnabled`, `isMazeBridgesEnabled`, `mazeColor`, `mazePathWidth`, `showMazeSolution`) are statically typed and strictly validated at runtime. This prevents injection or path manipulation during maze rendering.

## JSON-LD Caching & Performance Security

To prevent performance bottlenecks during client-side hydration and SPA navigation, the application caches serialized and escaped JSON-LD schema strings. Since JSON-LD requires synchronous regex replacement of unsafe characters (such as `<` and `>`), caching the computed string primitives protects the main thread from CPU-heavy operations while keeping cache keys lightweight and clean of memory leaks.

## URL Sanitization & DOM-XSS Protection

To prevent DOM-based Cross-Site Scripting (DOM-XSS) via dynamic anchors and `href` bindings of user-controlled or edge proxy URLs, we enforce strict URL sanitization:

- **Anchor Link Sanitization (`sanitizeHref`)**: Dynamic values destined for anchor `href` attributes are passed through `sanitizeHref` to ensure they only use safe, permitted schemes. This forces all URLs to start with safe, whitelisted prefixes: `http://`, `https://`, or relative paths starting with `/`. Any unsafe schemes (such as `javascript:`, `data:`, or `vbscript:`) are neutralized and fallback to `#`.
- **HTML Meta-Character Escaping (`escapeHtml`)**: In addition to scheme enforcement, values rendered as text nodes or embedded inside anchor tag `href` links are escaped. This safely converts characters like `&`, `<`, `>`, `"`, and `'` into their respective HTML entity equivalents (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`), entirely neutralizing DOM reinterpretation risks and ensuring robust DOM-XSS protection.

## Native DOMParser Allowlist HTML Sanitization (`sanitizeHtml`)

To safely render rich HTML text content across dynamic pages (such as `/security`) without relying on external npm runtime dependencies or risking DOM-XSS, QRCraftly incorporates browser-native synchronous HTML sanitization:

- **Browser-Native `DOMParser` Architecture**: Operates synchronously using `new DOMParser().parseFromString(html, 'text/html')` to construct a document tree for safe in-memory inspection and sanitization before DOM insertion. If `DOMParser` is unavailable (such as in non-browser environments), HTML input is safely escaped via `escapeHtml`.
- **Strict Tag Allowlist**: Only permits safe structural and rich-text formatting tags (`h1`-`h6`, `p`, `div`, `span`, `ul`, `ol`, `li`, `b`, `i`, `strong`, `em`, `a`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `blockquote`, `code`, `pre`, `br`, `hr`, etc.). Prohibited elements (such as `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<button>`) are completely removed from the tree.
- **Attribute Whitelisting & Event Handler Stripping**: Enforces an attribute allowlist (`id`, `class`, `role`, `aria-*`, `data-*`, `href`, `src`, `target`, `rel`, `title`, `alt`, etc.). Any inline event handlers (attributes starting with `on`) are immediately stripped.
- **URL & Style Defense**: Neutralizes dangerous schemes (`javascript:`, `vbscript:`, `file:`, unapproved `data:` URIs) on `href` and `src` attributes. Enforces `rel="noopener noreferrer"` for `target="_blank"` links, and strips `style` attributes containing dangerous script execution triggers.
- **Wrapper & Component Integration**: Exposed via the `<SanitizedHtml>` UI component which supports custom semantic container element overrides (`section`, `article`, `div`, `span`) and `className` styling while guaranteeing synchronous sanitization during rendering.
