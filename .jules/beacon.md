## 2025-05-18 - Dynamic Open Graph Images Pattern

**Discovery:**
The application used a hardcoded `og:image` meta tag in `Head.tsx`, preventing individual pages (like `/text-qr-code`, `/wifi-qr-code`) from displaying relevant social preview images. This limited social sharing engagement.

**Technical Pattern:**
Implemented a Vike-compatible configuration pattern to allow page-specific overrides:

1.  **Register Custom Config:**
    In `src/pages/+config.ts`, registered `image` and `imageAlt` keys using the `meta` property:
    ```typescript
    export default {
      meta: {
        image: { env: { server: true, client: true } },
        imageAlt: { env: { server: true, client: true } }
      }
    } satisfies Config;
    ```
    *Critical:* Without this registration, `vite build` fails with an "unknown config" error.

2.  **Consume in Head Component:**
    In `src/layouts/Head.tsx`, logic was added to read `config.image`, resolve relative paths against the domain (`https://qrcraftly.com`), and fallback to the default `og-image.png`.

3.  **Usage in Pages:**
    Pages can now simply export these properties in their `+config.ts`:
    ```typescript
    export default {
        image: '/og-image-text.png',
        imageAlt: 'Text QR Code Preview'
    }
    ```

**Impact:**
Enables rich social sharing previews for all current and future QR types without modifying the layout component. Validated via unit tests in `Head.test.tsx`.
