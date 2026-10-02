---
status: accepted
supersedes: 0002
---

# No Dynamic QR Codes: QRCraftly Stays Entirely Client-Side

## Context

Dynamic (editable) QR codes encode a short link to a redirect service, so the destination can change after printing and scans can be counted. QRCraftly carried a complete implementation ([ADR 0002](./0002-zero-knowledge-anchor-hash-redirection.md)): an edge Worker with a D1 database, Cloudflare Turnstile, rate limiting, a `/r/<id>` resolver page and a `/dynamic-dashboard`. It was never switched on in production; the UI flags stayed `false` and the Worker was never wired into `wrangler.jsonc`.

Any redirect service needs a server that stores links and sees every scan. That contradicts the product's core promise that QRCraftly runs entirely in the browser, keeps nothing on a server and tracks nobody ([PLEDGE.md](../PLEDGE.md)).

## Decision

QRCraftly makes static QR codes only. The redirect service, its resolver and dashboard pages, the Turnstile hook, the D1 binding, the dynamic-link storage keys and the related setup and documentation were removed (#1088). `/dynamic-dashboard` 301-redirects to `/`.

## Consequences

- Production is static assets only. There is no QRCraftly server API, so the bundle audit (`scripts/bundle_ast_audit.js`) no longer exempts any `/api/` URL and any same-origin API call fails the build.
- The storage allowlist ([ADR 0001](./0001-client-side-storage-allowlist.md)) shrinks to preference, template and probe keys; no allowlisted key holds a destination URL.
- Codes made with QRCraftly keep working for as long as their content does, because nothing sits between the scanner and the destination.
- People who want editable destinations or scan counts need another service. That trade is intended.
- Reintroducing server-side redirects, D1 or Turnstile needs a new ADR that supersedes this one.
