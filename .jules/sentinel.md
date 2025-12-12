# Sentinel Journal

## 2024-02-14 - Unintentional Secret Exposure in Build Config
**Vulnerability:** `vite.config.ts` was configured to expose `process.env.GEMINI_API_KEY` to the client via `define`.
**Learning:** Even if a secret is currently unused in the source code, configuring the build tool to inject it creates a "Loaded Gun" scenario where a future import or template usage could silently leak the key into the public client bundle.
**Prevention:** Audit `vite.config.ts` `define` blocks and `webpack.DefinePlugin` usage. Remove any environment variable injection that is not strictly required for the client application.
