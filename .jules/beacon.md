## 2025-04-29 - Fixed 404 Metadata Inheritance
**Discovery:** The global metadata setup in Vike inherits the default title and description for 404 pages from the global config or Head component if not explicitly overridden.
**Signal:** Added a `src/pages/_error/+config.ts` file to export a specific `title` and `description` to ensure the 404 page serves correct, descriptive metadata instead of the default global website metadata.
## 2025-04-30 - Add explicit width and height to images
**Discovery:** Discovered that the logo and border logo preview `<img>` tags in `LogoControls.tsx` and `BorderControls.tsx` were missing explicit `width` and `height` attributes, which can cause Cumulative Layout Shift (CLS) when images load.
**Signal:** Added explicit `width={48} height={48}` to the logo image (matching `w-12 h-12`) and `width={32} height={32}` to the border logo image (matching `w-8 h-8`).
**Impact:** Improves Core Web Vitals (CLS) by reserving space for the images before they load, preventing layout shifts.
