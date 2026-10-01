# Security Policy

## CI/CD Security Governance

To protect against supply-chain attacks, this project enforces immutable dependency pinning for all CI/CD components.

- **Versioning Standard**: All third-party GitHub Actions must be pinned to specific, immutable SHA-1 hashes instead of mutable version tags (e.g., `@v4`). Each pinned hash must be accompanied by a human-readable comment specifying the original version tag (e.g., `# v4.1.0`) to maintain readability.
- **Automated Monitoring**: Dependabot is configured to check for updates to external CI/CD dependencies weekly to ensure workflows are running the latest security patches.
- **Remediation**: In the event a vulnerable action is identified or an automated update PR is generated, developers must review the PR, verify the hash corresponds to the legitimate version update, and merge the update immediately. Any new workflows introduced must adhere to this pinning standard.

## Privacy & Compliance

This application is designed with a "Privacy First" architecture. Please refer to [COMPLIANCE.md](public/COMPLIANCE.md) for detailed information on how this application handles data and aligns with regulations like HIPAA.

## Content Security Policy (CSP)

Our application utilizes a multi-layered Content Security Policy (CSP) enforced via both meta tags and HTTP response headers. To protect production deployments from script-injection (XSS) attacks, our build pipeline automatically parses compiled static HTML assets and computes SHA-256 integrity hashes for all inline scripts (such as JSON-LD structured blocks, framework hydration elements and the pre-hydration theme initialisation script from `src/utils/theme.ts`, which must remain a static string so its hash is stable). Consequently, `script-src 'unsafe-inline'` is completely absent from production deployments. (`style-src 'unsafe-inline'` remains, because React renders dynamic preview styles as inline `style` attributes.) In local development environments, a permissive fallback policy is utilized to allow unimpeded feature iteration.

The base policy lives in two places that must stay byte-identical: the meta tag in `src/layouts/Head.tsx` and `BASE_CSP_PATTERN` in `scripts/csp_hash_injector.js`. A unit test fails the build if they drift apart.

- **No third-party origins:** The app no longer loads web fonts from Google Fonts; text renders with the system font stack (Tailwind's default `font-sans` and `font-mono`). Every directive therefore allows only `'self'`, plus the `data:` and `blob:` schemes where they are needed. No visitor IP address or referrer is sent to a font CDN. If a brand typeface is added later, bundle it with the app (for example from an `@fontsource` package) and keep `font-src 'self'`.
- **`img-src 'self' data: blob:`:** SVG export rasterizes its `blob:` object URL to check that the code scans, and the logo resize fallback decodes uploads through `blob:` URLs.
- **`media-src 'self' blob:`:** The optical scanner plays uploaded video files through `blob:` object URLs.
- **Regression coverage:** The `chromium-csp` Playwright project runs `e2e/csp-enforcement.spec.ts` against the built app with `bypassCSP: false`, so a policy that breaks SVG export fails in CI. The other projects still bypass CSP.

## Permissions Policy

`public/_headers` sends `Permissions-Policy: camera=*, microphone=(self), geolocation=(self), payment=()`. The camera is available for the optical scanner. The microphone is limited to the site itself, for Audio QR receive, and so is geolocation, for "Use Current Location" on the Location QR type. Payment is disabled. An empty allowlist `()` turns a feature off for the site itself too, so never use `()` for a feature the app calls. `tests/security_headers.test.ts` checks these values.

## Reporting a Vulnerability

If you discover a security vulnerability or a privacy leak, please report it immediately.

### How to Report

Please use the [GitHub Security Advisory](https://github.com/fderuiter/QRCraftly/security/advisories/new) to report vulnerabilities directly to the maintainers. We will acknowledge your report within 48 hours.

### Scope

- **In Scope:**
  - Data leaks (e.g., data being sent to a server).
  - XSS vulnerabilities.
  - Improper configuration of the client-side generator.
  - Bulk CSV processing & batch ZIP generation privacy boundary violations.
- **Out of Scope:**
  - Physical security of the user's device.
  - Browser-level vulnerabilities.

## Phone Sanitization & Validation

To prevent injection of arbitrary characters or command payloads into telephone or SMS QR codes, the application runs strict sanitization routines entirely on the client side:

- **General Phone Validation**: By default, general telephone input values are cleaned to remove all non-numeric and non-standard telephone symbols. Characters like semicolons and commas are stripped.
- **SMS Multi-Recipient Isolation**: To support advanced client-side SMS campaign configurations, the SMS generator uses an isolated sanitization option that preserves semicolons and commas, while rejecting letters, other symbols, and line-break control characters.
- **URI Delimiter Encoding**: After sanitization, `#` in a dial string is percent-encoded as `%23` (RFC 3966) so it cannot start a URI fragment and truncate the number. Mailto recipients are percent-encoded (RFC 6068, keeping `@`) so `?`, `&`, and `#` in the address cannot inject headers, and crypto wallet addresses are percent-encoded so `&` or `#` cannot inject payment parameters.

## SVG Sanitization & Path Tracking

To prevent custom SVG logo uploads and native vector exports from exposing users to DOM-XSS and structural XML injection, QRCraftly incorporates two security controls:

- **Static Path Tracking**: The build pipeline and pre-commit checks automatically trace data flows across files. They detect and block any unvalidated path where raw/external SVG code might reach rendering/storage sinks without passing through `sanitizeSvg()`.
- **Mosaic QR Images**: A mosaic design (`QRConfig.mosaicImageUrl`, ADR 0019) goes through the same `useImageUpload` validation, SVG sanitization and resizing as a logo. It is decoded on the device into an in-memory cache of at most four images, never written to browser storage and never sent over the network.
- **Runtime SVG Sanitization**: Uploaded logos and border images are processed entirely within the client browser to maintain offline privacy. The runtime parser enforces a zero-trust strict safe-element allowlist and zero-tolerance styling:
  - Discards any elements not present on a strict safe-element allowlist (such as `<foreignObject>`, `<embed>`, `<object>`, `<script>`, etc.).
  - Discards `<style>` blocks and element `style` attributes entirely if they contain any `@import` reference.
  - Limits nested data URIs to safe image MIME-types and strips any with active payload markers or script references. This is validated by an optimized, localized helper function within the security utility to ensure clean code and prevent unused export overhead.
  - Strips all inline event handlers (attributes starting with `on`).
  - Neutralizes any remote or dangerous resource requests inside style blocks, style attributes, or `href`/`xlink:href` references while preserving standard layout paths, responsive viewBox attributes, linear gradients, and clip paths.

## Persistent Browser Storage Allowlist

The build and pre-commit pipelines run static AST analysis (`scripts/storage_privacy_ast_auditor.js`) on source code before compilation. It scans for browser persistent storage operations (`localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `caches`) and enforces an explicit allowlist of authorized keys (`qrcraftly:dynamic-redirects`, `qrcraftly:dynamic-consent-accepted`, `qrcraftly:theme`, `__test__`). The `qrcraftly:theme` key stores only the visitor's colour-theme preference (`light`, `dark` or `system`). The `qrcraftly:dynamic-redirects` key is the one exception to preference-only storage: when Dynamic Redirection is switched on (it is off in production), it keeps the person's own dynamic links on their device, including each original destination URL in plain text, its decryption key and its admin key. Any attempts to persist transient QR payload data or use unapproved keys immediately abort the build.

## QR Animation Loops

Animation configuration structures in `types.ts` are strictly statically typed to prevent any runtime execution or script-injection pathways during high-frequency loop playbacks.

## Playable Maze Overlay

Maze overlay configurations in `types.ts` (e.g., `isMazeEnabled`, `isMazeBridgesEnabled`, `mazeColor`, `mazePathWidth`, `showMazeSolution`) are statically typed and strictly validated at runtime. This prevents injection or path manipulation during maze rendering.

## JSON-LD Caching & Performance Security

To prevent performance bottlenecks during client-side hydration and SPA navigation, the application caches serialized and escaped JSON-LD schema strings. Since JSON-LD requires synchronous regex replacement of unsafe characters (such as `<` and `>`), caching the computed string primitives protects the main thread from CPU-heavy operations while keeping cache keys lightweight and clean of memory leaks. The escaping itself lives in `safeJsonLdStringify` (`src/utils/security.ts`): it serialises any JSON value and rewrites `<`, `>` and `&` as `\u003c`, `\u003e` and `\u0026`, so schema text can never close the surrounding `<script>` element. `JsonLdScript` (`src/components/ui/JsonLdScript.tsx`) is the component that injects the result.

## URL Sanitization & DOM-XSS Protection

To prevent DOM-based Cross-Site Scripting (DOM-XSS) via dynamic anchors and `href` bindings of user-controlled or edge proxy URLs, we enforce strict URL sanitization:

- **Anchor Link Sanitization (`sanitizeHref`)**: Dynamic values destined for anchor `href` attributes are passed through `sanitizeHref` to ensure they only use safe, permitted schemes. This forces all URLs to start with safe, whitelisted prefixes: `http://`, `https://`, or relative paths starting with `/`. Any unsafe schemes (such as `javascript:`, `data:`, or `vbscript:`) are neutralized and fallback to `#`.
- **HTML Meta-Character Escaping (`escapeHtml`)**: In addition to scheme enforcement, values rendered as text nodes or embedded inside anchor tag `href` links are escaped. This safely converts characters like `&`, `<`, `>`, `"`, and `'` into their respective HTML entity equivalents (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`), entirely neutralizing DOM reinterpretation risks and ensuring robust DOM-XSS protection.

## Bot Protection & Edge Anti-Abuse (Cloudflare Turnstile)

Dynamic redirect link generation (`/r/[id]`) incorporates Cloudflare Turnstile bot verification to defend against automated abuse, denial-of-wallet attacks, and unauthorized database writes. Client-acquired verification tokens are validated prior to committing new dynamic routes to Cloudflare D1. Verification fails closed: production code has no bypass tokens and no fallback secret, so a missing `TURNSTILE_SECRET_KEY` or an unreachable siteverify service rejects registration. Every redirect route is also rate limited through the Cloudflare Rate Limiting binding, writes require an allowlisted `Origin`, bodies are capped at 16 KiB, and only `enc:v1:` ciphertext is accepted, so the API cannot act as a plaintext open redirector. See `docs/public/EDGE_ARCHITECTURE.md` for the full rules.
