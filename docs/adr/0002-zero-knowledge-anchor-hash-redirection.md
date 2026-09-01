---
status: accepted
---

# Zero-Knowledge Anchor Hash Encryption for Dynamic Redirection

## Context

Dynamic QR codes require an intermediary routing endpoint (`/r/[id]`) so destination URLs can be updated after physical printing. Storing destination targets in plaintext on servers or in database logs exposes user scan activity and private endpoints to infrastructure operators and potential data breaches.

## Decision

We encrypt the destination URL client-side with AES-GCM via the Web Crypto API, storing only the encrypted blob in Cloudflare D1/KV while retaining the decryption key exclusively in the URL anchor hash fragment (`https://qrcraftly.com/r/[id]#key=...`).

## Rationale

Per RFC 3986, browsers never send URL anchor hash fragments across HTTP request headers. The edge routing server only handles the encrypted payload and remains cryptographically blind to the destination, achieving zero-knowledge privacy.

## Consequences

- End-to-end privacy for dynamic QR routing without exposing target destinations in server transit logs.
- Decryption occurs entirely on the client before executing the final browser redirection.
- Stripping or corrupting the anchor hash fragment prevents destination recovery, failing safely closed.
