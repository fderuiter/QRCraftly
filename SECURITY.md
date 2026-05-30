# Security Policy

## CI/CD Security Governance
To protect against supply-chain attacks, this project enforces immutable dependency pinning for all CI/CD components. 
- **Versioning Standard**: All third-party GitHub Actions must be pinned to specific, immutable SHA-1 hashes instead of mutable version tags (e.g., `@v4`). Each pinned hash must be accompanied by a human-readable comment specifying the original version tag (e.g., `# v4.1.0`) to maintain readability.
- **Automated Monitoring**: Dependabot is configured to check for updates to external CI/CD dependencies weekly to ensure workflows are running the latest security patches.
- **Remediation**: In the event a vulnerable action is identified or an automated update PR is generated, developers must review the PR, verify the hash corresponds to the legitimate version update, and merge the update immediately. Any new workflows introduced must adhere to this pinning standard.

## Privacy & Compliance
This application is designed with a "Privacy First" architecture. Please refer to [COMPLIANCE.md](COMPLIANCE.md) for detailed information on how this application handles data and aligns with regulations like HIPAA.

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
