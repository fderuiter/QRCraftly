## 2026-05-08 - Open Graph Defaults in Vike
A reusable pattern for Open Graph images: Vike `+config.ts` files need explicit `image` and `imageAlt` properties to correctly populate `og:image` and `twitter:image` tags in `src/layouts/Head.tsx`. Default fallbacks are unreliable without these explicit declarations.
