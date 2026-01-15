# Beacon Journal

## 2024-02-20 - Missing Social Signals
Identified that `Head.tsx` was missing crucial Open Graph and Twitter Card tags for `title` and `description`.
While Vike injects basic `title` and `meta name="description"`, these do not automatically populate `og:title`, `og:description`, `twitter:title`, or `twitter:description`.
Also, `og:image:alt` was missing.
This resulted in poor social sharing previews where platforms might guess the title or show no description.
Implemented logic to pull `title` and `description` from `pageContext.config` and populate these tags.

## 2026-01-15 - Open Graph Image Standardization
Identified that social sharing previews were suboptimal due to using the small `favicon.png` as the Open Graph image.
Found a high-resolution asset (`star_style.png`) in the root and promoted it to `public/og-image.png` to serve as the standard social share image.
Updated `Head.tsx` to use this new asset and upgraded the Twitter Card type to `summary_large_image` for better visibility.
