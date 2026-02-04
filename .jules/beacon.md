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

## 2025-02-14 - [Structured Data] High-Res Images for WebApplication Schema
Switched from low-res `favicon.png` to high-res `og-image.png` in `WebApplication` schema to improve rich result appearance.
Updated `src/pages/index/+Page.tsx` and `src/pages/wifi-qr-code/+Page.tsx` and their respective tests.

## 2025-02-18 - Open Graph Image Dimensions
**Discovery:** Social platforms (like WhatsApp, iMessage, Slack) often delay rendering link previews or display them as small thumbnails if the image dimensions are not explicitly declared in the meta tags.
**Signal:** Added `og:image:width` and `og:image:height` tags to `src/layouts/Head.tsx`.
**Impact:** Ensures immediate, large-card rendering on social platforms by preventing the need for the scraper to download the image to determine its size.
**Verification:** Validated via `src/layouts/Head.test.tsx` checking for specific meta content values (1200x630).
