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

## 2025-02-15 - [Social Signals] Open Graph Image Dimensions
**Discovery:** Social platforms often delay rendering link previews or fallback to smaller cards if they cannot immediately determine the image dimensions.
**Signal:** Added explicit `og:image:width`, `og:image:height`, and `og:image:type` meta tags to `src/layouts/Head.tsx`.
**Impact:** Ensures immediate, full-size rendering of social cards on platforms like Facebook, LinkedIn, and Discord without requiring them to download the image first.
## 2025-05-18 - Enriching HowTo Schema
**Signal:** Enhanced  schema on  with , , , and .
**Impact:** Enables Rich Results in Google Search, showing time (1 min) and cost (Free) directly in snippets.
**Verification:** Validated via JSON-LD inspection in tests and rendered HTML.
## 2025-05-18 - Enriching HowTo Schema
**Signal:** Enhanced `HowTo` schema on `/wifi-qr-code` with `totalTime`, `estimatedCost`, `supply`, and `tool`.
**Impact:** Enables Rich Results in Google Search, showing time (1 min) and cost (Free) directly in snippets.
**Verification:** Validated via JSON-LD inspection in tests and rendered HTML.

## 2025-05-19 - [Structured Data] Dynamic BreadcrumbList Schema
**Discovery:** Breadcrumbs were hardcoded for only two pages, leaving new or nested routes without proper navigational schema.
**Signal:** Implemented dynamic `BreadcrumbList` generation in `src/layouts/Head.tsx` by parsing `pageContext.urlPathname`.
**Impact:** Ensures all current and future pages (e.g. `/products/item`) automatically receive Rich Result eligibility for breadcrumbs in SERPs.
**Verification:** Added comprehensive tests in `src/layouts/Head.test.tsx` verifying path parsing and JSON-LD structure.
