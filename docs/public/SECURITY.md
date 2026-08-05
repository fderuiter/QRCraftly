# Security Policy

## CI/CD Security Governance
To protect against supply-chain attacks, this project enforces immutable dependency pinning for all CI/CD components. 
- **Versioning Standard**: All third-party GitHub Actions must be pinned to specific, immutable SHA-1 hashes instead of mutable version tags (e.g., `@v4`). Each pinned hash must be accompanied by a human-readable comment specifying the original version tag (e.g., `# v4.1.0`) to maintain readability.
- **Automated Monitoring**: Dependabot is configured to check for updates to external CI/CD dependencies weekly to ensure workflows are running the latest security patches.
- **Remediation**: In the event a vulnerable action is identified or an automated update PR is generated, developers must review the PR, verify the hash corresponds to the legitimate version update, and merge the update immediately. Any new workflows introduced must adhere to this pinning standard.

## Privacy & Compliance
This application is designed with a "Privacy First" architecture. Please refer to [COMPLIANCE.md](COMPLIANCE.md) for detailed information on how this application handles data and aligns with regulations like HIPAA.

## Content Security Policy (CSP)
Our application utilizes a multi-layered Content Security Policy (CSP) enforced via both meta tags and HTTP response headers. To protect production deployments from script-injection (XSS) attacks, our build pipeline automatically parses compiled static HTML assets and computes SHA-256 integrity hashes for all inline scripts (such as JSON-LD structured blocks and framework hydration elements). Consequently, the `unsafe-inline` directive is completely absent from production deployments. In local development environments, a permissive fallback policy is utilized to allow unimpeded feature iteration.

## Reporting a Vulnerability

If you discover a security vulnerability or a privacy leak, please report it immediately.

### How to Report

Please use the [GitHub Security Advisory](https://github.com/fderuiter/QRCraftly/security/advisories/new) to report vulnerabilities directly to the maintainers. We will acknowledge your report within 48 hours.

### Scope

*   **In Scope:**
    *   Data leaks (e.g., data being sent to a server).
    *   XSS vulnerabilities.
    *   Improper configuration of the client-side generator.
*   **Out of Scope:**
    *   Physical security of the user's device.
    *   Browser-level vulnerabilities.

## Phone Sanitization & Validation

To prevent injection of arbitrary characters or command payloads into telephone or SMS QR codes, the application runs strict sanitization routines entirely on the client side:
- **General Phone Validation**: By default, general telephone input values are cleaned to remove all non-numeric and non-standard telephone symbols. Characters like semicolons and commas are stripped.
- **SMS Multi-Recipient Isolation**: To support advanced client-side SMS campaign configurations, the SMS generator uses an isolated sanitization option that preserves semicolons and commas, while rejecting letters, other symbols, and line-break control characters.

## Control-Character and Zero-Width Sanitization Parity

To prevent validation-sanitization parity drift which blocks QR code generation for legitimate user inputs:
- **Centralized Security Library**: All core control-character and zero-width regular expressions are defined in `src/utils/securityConstants.ts` as the single source of truth.
- **Mirror Sanitization**: Plain-text input and general payload sanitization strip zero-width spaces (e.g., zero-width space `\u200B`, zero-width non-joiner `\u200C`, zero-width joiner `\u200D`), Byte Order Marks (`\uFEFF`), and strict control characters (ASCII/Latin-1 control characters in ranges `\x00-\x1F` and `\x7F-\x9F`).
- **Formatting Preservation**: Structured payloads like vCards and Events preserve multi-line formatting (newlines, carriage returns, and tabs) during validation and sanitization while cleanly stripping other non-printable, control, or zero-width characters.
