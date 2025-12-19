# Beacon Journal

## 2024-02-20 - Missing Social Signals
Identified that `Head.tsx` was missing crucial Open Graph and Twitter Card tags for `title` and `description`.
While Vike injects basic `title` and `meta name="description"`, these do not automatically populate `og:title`, `og:description`, `twitter:title`, or `twitter:description`.
Also, `og:image:alt` was missing.
This resulted in poor social sharing previews where platforms might guess the title or show no description.
Implemented logic to pull `title` and `description` from `pageContext.config` and populate these tags.
