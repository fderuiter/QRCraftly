---
publish-approved: true
audience: developers # internal developer documentation, not published on /security
---

# Shared UI Component Registry and Utility Catalog

## Overview

This catalog serves as the central directory index for all reusable UI components, styling controls, input modules, and color utilities within the QRCraftly repository.

To eliminate logical UI redundancy, prevent design drift, and maintain robust WCAG accessibility compliance, **all developers must consult this catalog before implementing any new visual elements, slider inputs, or color-related algorithms.** Peer reviewers will actively audit every pull request against this catalog to ensure maximum reuse of pre-existing codebase assets.

Document component props with JSDoc only where the comment adds information. Empty `/** */` blocks and bare `@param name` stubs are rejected by ESLint (`jsdoc/no-blank-blocks`, `jsdoc/check-param-names`), so do not generate them.

---

## 1. Core Shared UI Elements (`src/components/ui/`)

These low-level, primitive UI elements are designed to be extremely customizable, fully accessible, and unified in appearance.

They style themselves only with the semantic design tokens from `src/layouts/index.css` (`bg-surface`, `text-fg-muted`, `border-line`, `bg-action`, `ring-focus` ...), which switch with the theme, so they carry no raw palette classes and no `dark:` colour variants. The token table is in [`STYLE_GUIDE.md`](STYLE_GUIDE.md#2-design-tokens); `scripts/design_token_audit.js` enforces it.

- **Accordion** (`Accordion.tsx` / `Accordion.test.tsx`): A collapsible vertical disclosure component for FAQs and grouped controls. Each item's button exposes `aria-expanded`/`aria-controls`; collapsed panels stay mounted (hidden), so state is kept and content remains in server-rendered HTML. Pass `headingLevel` to put the button in the document outline.
- **Alert** (`Alert.tsx` / `Alert.test.tsx`): Displays warning, error, or informational banners with standard status states, an accessible dismiss action, and full WCAG contrast compliance.
- **Button** (`Button.tsx` / `Button.test.tsx`): High-reusability button supporting visual variants (`primary`, `secondary`, `outline`, `error`, `ghost`, `menuitem`, `icon`), sizes (`sm`, `md`, `lg`, `icon`, `none`) and `fullWidth`; it defaults to `type="button"`. `aria-disabled="true"` gets the same dimmed, not-allowed styling as `disabled` while staying focusable (use it with `aria-describedby` to explain why an action is unavailable). For toggle or selected-state buttons pass `pressed`: it sets `aria-pressed` and applies a selected style defined for both light and dark themes (do not pass selected-state border classes through `className`; they lose to the variant's `dark:` classes). For navigation that should look like an action, use the `ButtonLink` export from the same file: it renders a real `<a>` with the same `variant`, `size` and `fullWidth` props, and renders nothing when `isDangerousUrl` rejects the `href`. Do not hand-style `<a>` elements as buttons.
- **Card** (`Card.tsx` / `Card.test.tsx`): Container box styled consistently with modern borders, background transitions, and padding rules.
- **ColorInput** (`ColorInput.tsx` / `ColorInput.test.tsx`): A specialized, keyboard-accessible text and visual picker element for hex colors with WCAG 2.1 SC 1.4.11 compliant hover states.
- **FieldWrapper** (`FieldWrapper.tsx`): Form layout primitive that automatically renders labels, assistive descriptions, character counts, and error states.
- **FormBlock** (`FormBlock.tsx` / `FormBlock.test.tsx`): Structural wrapper to organize form fields, titles, and action grids neatly.
- **FormFields** (`FormFields.tsx`): Standard field grouping configurations with WCAG 2.1 SC 1.4.11 compliant border boundaries.
- **JsonLdScript** (`JsonLdScript.tsx`): Secure utility component that safely injects structural SEO schema metadata. `data` accepts any JSON value and is serialised through `safeJsonLdStringify`, which escapes `<`, `>` and `&` so the schema cannot close its `<script>` element.
- **Menu** (`Menu.tsx` / `Menu.test.tsx`): Accessible menu button (WAI-ARIA menu button pattern) for action lists such as the Download formats: `aria-haspopup`/`aria-expanded`/`aria-controls` on the trigger, Arrow/Home/End navigation, Escape and item activation restore trigger focus, and outside press or focus loss closes it.
- **Modal** (`Modal.tsx` / `Modal.test.tsx`): Accessibility-compliant dialog component complete with focus traps, exit listeners, and smooth animations.
- **PatternModule** (`PatternModule.tsx`): Visual sub-module used to configure and showcase QR pattern variants, rendering customized preview shapes including fluid bezier curves for Fluid Ink.
- **PrimaryNav** (`PrimaryNav.tsx` / `PrimaryNav.test.tsx`): Site-wide primary navigation rendered from the shared `PRIMARY_NAV_ITEMS` model in `src/data/navigation.ts` (Create QR, File Transfer, Arcade, About, Security). Rendered once, by `AppShell`. From `lg` up every destination is an inline link with a motion-safe underline on the current page (`aria-current="page"`); below `lg` a menu button opens a `Modal` dialog with 48px links that traps focus, closes with Escape or a backdrop press and returns focus to the button. The Beta tag uses `text-xs`, the smallest text size allowed in the UI. Never add a second nav to a page.
- **RangeInput** (`RangeInput.tsx` / `RangeInput.test.tsx`): **Mandatory slider control component** supporting minimum, maximum, step-size configuration, and granular visual previews.
- **SanitizedHtml** (`SanitizedHtml.tsx`): Safe, sanitized HTML injection system to avoid cross-site scripting (XSS) issues in dynamically parsed rich content.
- **TextField** (`TextField.tsx`): Standard form text input primitive with full validation styles and focus rings.
- **ThemeToggle** (`ThemeToggle.tsx` / `ThemeToggle.test.tsx`): The single colour-theme control used on every page. Cycles System, Light and Dark through the global `ThemeProvider` (from `@/context/ThemeContext`) with a consistent accessible label.
- **Toast** (`Toast.tsx` / `Toast.test.tsx`): Auto-dismissing alerts that slide into view to acknowledge user actions without interrupting their workflow, with a safe fallback mock context when running outside a provider (e.g., in unit tests). Pass `persistent: true` to keep a toast open until dismissed, and `action: { label, onClick }` to add a button that runs the action and closes the toast (used by the service worker "new version available" prompt). Below `md` toasts sit above the generator's docked export bar instead of covering it.
- **ToggleSwitch** (`ToggleSwitch.tsx` / `ToggleSwitch.test.tsx`): Accessible sliding checkbox switch used for toggle-only options with 3:1 non-text contrast tracks in both active and inactive states.

---

## 2. QR Input Form Panel Components (`src/components/inputs/`)

These components capture specialized data structures required to construct distinct QR code types. They rely entirely on primitive UI inputs and check free-text fields against the `CONTAINMENT_PROFILES` exported by `@/packages/qr-payload`.

- **BulkCsvInput** (`BulkCsvInput.tsx` / `BulkCsvInput.test.tsx`): Bulk CSV Batch form, code-split behind `LazyBulkCsvInput.tsx` so it loads only on that type. Parses the CSV and writes the ZIP with `@/packages/bulk-csv` in memory (at most 500 rows). The live preview encodes only the first row with a payload and says which row it shows (`previewRow` from `@/packages/bulk-csv`). Supports column mapping, PNG/SVG format selection, accessible file upload inputs, malformed CSV and missing-payload handling, progress tracking, and zero network calls.
- **EmailInput** (`EmailInput.tsx`): Standard email layout supporting recipient, subject, and body message fields.
- **EventInput** (`EventInput.tsx`): Calendar appointment configuration form specifying title, times, description, and venue.
- **LazyBulkCsvInput** (`LazyBulkCsvInput.tsx`): Registry entry for the Bulk CSV Batch type. Renders a placeholder during prerendering and hydration, then loads the batch generator chunk on the client.
- **LocationInput** (`LocationInput.tsx` / `LocationInput.test.tsx`): High-accuracy coordinate form requiring proper latitude and longitude decimals.
- **MeetingInput** (`MeetingInput.tsx` / `MeetingInput.test.tsx`): Specialized input fields to enter URL links and meeting passwords.
- **PaymentInput** (`PaymentInput.tsx`): Cryptocurrency checkout fields validating address formats and value sizes.
- **PhoneInput** (`PhoneInput.tsx`): Clean, accessible phone dial code layout.
- **SmsInput** (`SmsInput.tsx`): SMS composer form holding receiver number and predefined message.
- **SocialInput** (`SocialInput.tsx` / `SocialInput.test.tsx`): Selectors for major platforms alongside handler name parsing.
- **TextInput** (`TextInput.tsx`): Minimalist form component capturing standard unformatted text.
- **TypeSelector** (`TypeSelector.tsx` / `TypeSelector.test.tsx`): QR type navigation rendered as ordinary links to each single-code type's dedicated route inside a labelled `nav` list (twelve links, four per row; the Bulk CSV batch tool is linked from the generator list instead so the grid stays three rows on small phones). The current route is marked with `aria-current="page"`; Tab reaches every link and arrow keys are not intercepted. Uncommitted form input state is preserved in a volatile module-level cache across route switches.
- **UrlInput** (`UrlInput.tsx` / `UrlInput.test.tsx`): Website URL field that normalizes the protocol on blur and flags dangerous schemes (`isDangerousUrl`). The URL is encoded directly into a static QR code.
- **VCardInput** (`VCardInput.tsx`): Extensive contact form detailing names, organization, email, phone, and address.
- **WifiInput** (`WifiInput.tsx` / `WifiInput.test.tsx`): Wireless network panel specifying SSID, passwords, and security type, plus EAP method and phase 2 selects for WPA2-Enterprise.

---

## 3. Styling & Customization Controls (`src/components/style-controls/`)

Unified appearance control modules that manage and present customization options in a modular side navigation menu.

- **AdvancedControls** (`AdvancedControls.tsx`): Advanced generator settings panel managing Error Correction Level options.
- **BorderControls** (`BorderControls.tsx` / `BorderControls.test.tsx`): Controls options for border thickness, padding, and corner radius around outputs.
- **BrandTemplateGallery** (`BrandTemplateGallery.tsx` / `BrandTemplateGallery.test.tsx`): Curated preset gallery and custom persistent brand template management panel with 1-click JSON export/import. Saved templates keep style settings only (no QR content, text or uploaded images); the Presets / My Templates tabs use `Button`, and all text uses semantic tokens at `text-xs` or larger.
- **ColorControls** (`ColorControls.tsx` / `ColorControls.test.tsx`): Consolidates pickers and presets for foreground, background, and corner eye accents. Presets are a three-column radio grid with visible names and a bold border plus check mark on the selected preset.
- **ContrastWarning** (`ContrastWarning.tsx`): Dynamic accessibility banner that displays contrast warnings if combinations fall below WCAG parameters.
- **LayoutControls** (`LayoutControls.tsx` / `LayoutControls.test.tsx`): Controls size, padding, margin, and output format.
- **LogoControls** (`LogoControls.tsx`): Coordinates uploading custom logos (hidden file input labelled "Upload logo image"), configuring scaling boundaries, and adjusting background-mask thresholds.
- **MosaicControls** (`MosaicControls.tsx` / `MosaicControls.test.tsx`): Controls for Mosaic QR (ADR 0019): tiles an uploaded design into the QR modules while every module keeps its dark or light value. The image is processed on this device only.
- **PatternControls** (`PatternControls.tsx` / `PatternControls.test.tsx`): Pattern-style selector that conditionally displays one assertive scannability warning for low-reliability patterns, avoiding duplicate screen-reader announcements.

---

## 3a. QR Arcade Components (`src/components/arcade/`)

Page-level building blocks of `/arcade`. Game logic lives in the `@/packages/arcade` deep module; these components only render it with catalog primitives (`Button`, `Card`, `Modal`, `TextField`, `ToggleSwitch`).

- **ChoiceGroup** (`ChoiceGroup.tsx`): Single-select radio group or tab list of `Button`s with a roving tab stop and Arrow/Home/End keys; selection uses the Button `pressed` style while `aria-checked`/`aria-selected` carry the state.
- **ArcadeCockpit** (`ArcadeCockpit.tsx`): Responsive arcade layout: stacked arena-first layout with a quick weapon bar and a collapsible settings drawer below 1024px, three-pane cockpit from 1024px.
- **ScanHud** (`ScanHud.tsx`): Dual-layer verification HUD (Reed-Solomon health bar and finder status beside the live scanner verdict).
- **StressTestButton** (`StressTestButton.tsx`): "Stress Test in Arcade" call to action for the generator preview; hands the design over in memory only.

---

## 4. Shared Feature Components (`src/components/`)

Feature-level building blocks shared by several routes. Reuse these instead of rebuilding page chrome, previews or status output.

- **AppShell** (`AppShell.tsx` / `AppShell.test.tsx`): The one app shell every route renders through `LayoutDefault`: skip link, `AppHeader` (home link, `PrimaryNav`, theme toggle), the `main` landmark and `AppFooter` (generators, tools, company links and the pledge tagline) on the `bg-page` background. Pages render only their content.
- **CharCount** (`CharCount.tsx` / `CharCount.test.tsx`): Accessible character counter for length-limited inputs, with a progress ring and polite limit announcements.
- **ErrorBoundary** (`ErrorBoundary.tsx`): Root error boundary that renders an application error message and a `Button` to reload the page, clearing simulated-crash query flags.
- **InputPanel** (`InputPanel.tsx` / `InputPanel.test.tsx`): Content entry for the generator: renders the QR type navigation, the active type's input form and the scan-to-fill scanner with a human-readable "type detected" toast.
- **MiniPreview** (`MiniPreview.tsx` / `MiniPreview.test.tsx`): Phone-only floating thumbnail of the QR preview, shown above the docked export row while the preview region is scrolled away; tapping it scrolls back. Decorative (`aria-hidden`, not focusable): the header's "Preview & download" link is the accessible route.
- **QRCanvas** (`QRCanvas.tsx` / `QRCanvas.test.tsx`): Worker-backed QR preview canvas that renders the matrix, patterns, logo, border and export templates, and clears itself for empty content.
- **QRScanner** (`QRScanner.tsx` / `QRScanner.test.tsx`): Webcam and file-upload QR scanner; the input mode switch is a `Button` group with `aria-pressed`, and the upload dropzone is a `Button` with the file input outside it.
- **QRTool** (`QRTool.tsx` / `QRTool.test.tsx`): The generator page: content and appearance controls in `ToolWorkspaceLayout`, the QR as the largest element of the preview with a status strip (sample badge, scannability) under it, one export row (Download menu, Copy, Share) that docks to the bottom of the screen below `md` and steps aside while a text field has focus, the Arcade link as a tertiary action, and how-to/FAQ below the workspace. The site footer comes from `AppShell`.
- **QRTypePage** (`QRTypePage.tsx`): Route wrapper that opens `QRTool` preset to one QR type and injects that page's structured data.
- **ScannabilityIndicator** (`ScannabilityIndicator.tsx` / `ScannabilityIndicator.test.tsx`): One scannability verdict (Scans reliably, Scans, but fragile, Won't scan reliably) from `getScanVerdict` in the scannability package, with icon, wording and a 0-100 score ring in one tone. The pill opens a details panel listing what was tested, the top issue in plain words (`getScanAdvice`) and a one-tap fix; Escape or an outside press closes it. One polite, debounced status region for routine updates and one alert for failures; no keyboard shortcut. Never shows "verified".
- **ServiceWorkerUpdatePrompt** (`ServiceWorkerUpdatePrompt.tsx`): Registers the service worker and, when a new version is ready, shows a persistent `Toast` with a Reload action instead of replacing the version serving open tabs. Renders nothing itself.
- **SidebarContent** (`SidebarContent.tsx` / `SidebarContent.test.tsx`): Server-rendered overview, how-to steps and FAQ for a tool, rendered at article width below the workspace.
- **StyleControls** (`StyleControls.tsx` / `StyleControls.test.tsx`): Appearance controls grouped into `Accordion` disclosure sections (Pattern & Colors open by default, Layout & Border, Logo) plus the Advanced Mode disclosure; collapsed sections stay mounted so nothing is lost.
- **ToolWorkspaceLayout** (`ToolWorkspaceLayout.tsx` / `ToolWorkspaceLayout.test.tsx`): Shared responsive tool workspace (generator, file sender, file receiver) and its `ToolWorkspaceHeader` (page heading, tool actions and the mobile jump link; site navigation lives in `AppShell`). Mobile: one in-flow column (controls, preview, secondary controls) with the document as the only scroll surface and a jump-to-preview link. Desktop: control column beside a sticky, viewport-height preview.
- **TransferModeSwitcher** (`TransferModeSwitcher.tsx` / `TransferModeSwitcher.test.tsx`): Route-aware segmented mode switcher control allowing instant role toggling between "Send File" (/file-transfer) and "Receive File" (/file-transfer/receive).

---

## 5. Shared Utilities & Renderers (`src/utils/colorUtils.ts` & `src/packages/qr-matrix/`)

These utility functions handle hex conversion, relative luminance, contrast checks, and specialized QR module canvas drawing routines. **Do not write custom math, hex formatting, or bespoke path-drawing logic under any circumstances.**

- `hexToRgba(hex: string, alpha: number): string` (`src/utils/colorUtils.ts`)
  - **Description:** Converts a hex colour to a CSS `rgba()` string (used by export templates); invalid input falls back to black.
- `normalizeHex(val: string): string | null` (`src/utils/colorUtils.ts`)
  - **Description:** Normalizes custom hex inputs (supports shorthand `#abc`, converts to `#aabbcc`, formats casing, and appends a `#` prefix if absent).
- `getContrastRatio(fg: string, bg: string): number` (`src/utils/colorUtils.ts`)
  - **Description:** Computes the contrast ratio between foreground and background sRGB colors based on WCAG 2.0 relative luminance formulas.
- `renderModules` (`src/packages/qr-matrix/lib/modules.ts`, imported from `@/packages/qr-matrix`)
  - **Description:** Central vector module drawing orchestrator executing batched two-pass drawing across standard, geometric, and artistic styles.
- `renderFluidModules` (`src/packages/qr-matrix/lib/fluid.ts`, imported from `@/packages/qr-matrix`)
  - **Description:** High-performance fluid vector renderer evaluating 4-neighbor matrix module connectivity to draw continuous bezier curve bridges for the Fluid Ink style without impacting corner finder patterns.
- `getLuminance(hex: string): number` and `getLuminanceFromRgb(r: number, g: number, b: number): number` (`src/utils/colorUtils.ts`)
  - **Description:** WCAG relative luminance of a hex colour or of 0–255 RGB channels. Use these instead of writing luminance weights.
- Shared form class strings (`src/components/ui/styles.ts`)
  - **Description:** Tailwind class constants for inputs, fieldsets, legends and grids (for example `TEXT_FIELD_CLASSES`, `GRID_TWO_COLUMNS_CLASSES`). Reuse them so custom fields match `TextField` and `FormFields`.

---

## 6. Development Guardrails: Guidelines for Reuse

To avoid duplicate controls and logical divergence:

1.  **Do Not Create Custom Sliders:** All range selectors must be configured via the existing `RangeInput` component.
2.  **Do Not Duplicate Pickers:** All color pickers must rely on `ColorInput` and its internal validators.
3.  **Do Not Code Custom Color Math:** Do not write custom contrast checks, relative luminance weights, or hex parsers. Import `normalizeHex` or `getContrastRatio` directly from `src/utils/colorUtils.ts`.
4.  **Audit Before Submitting:** If you are building a new feature, compare the required controls against this index. If a component matches, import and wrap it instead of replicating it.
