## 2025-01-29 - [Open Graph Dimensions and Image Quality]
**Discovery:** The application was missing `og:image:width` and `og:image:height` tags, which can cause social platforms to display a small thumbnail or delay rendering the preview card. Additionally, the `WebApplication` schema was using the low-resolution favicon (`favicon.png`) as the primary image, reducing eligibility for rich results.
**Signal:** Added explicit dimension tags (`1280` x `720`) to `Head.tsx` and updated the `image` property in JSON-LD schemas to point to the high-resolution `og-image.png`.
**Impact:** Ensures instant, full-size rendering of social cards on platforms like Twitter/Facebook and improves the quality of Rich Results in Google Search by providing a compliant, high-resolution image.
