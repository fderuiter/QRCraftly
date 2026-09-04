---
publish-approved: true
---

# Shared UI Component Registry and Utility Catalog

## Overview

This catalog serves as the central directory index for all reusable UI components, styling controls, input modules, and color utilities within the QRCraftly repository.

To eliminate logical UI redundancy, prevent design drift, and maintain robust WCAG accessibility compliance, **all developers must consult this catalog before implementing any new visual elements, slider inputs, or color-related algorithms.** Peer reviewers will actively audit every pull request against this catalog to ensure maximum reuse of pre-existing codebase assets.

---

## 1. Core Shared UI Elements (`src/components/ui/`)

These low-level, primitive UI elements are designed to be extremely customizable, fully accessible, and unified in appearance.

- **Accordion** (`Accordion.tsx` / `Accordion.test.tsx`): A collapsible vertical disclosure component ideal for FAQs or grouped menus.
- **Alert** (`Alert.tsx` / `Alert.test.tsx`): Displays warning, error, or informational banners to the user with standard status states.
- **Alert** (`Alert.tsx` / `Alert.test.tsx`): Displays warning, error, or informational banners with standard status states, an accessible dismiss action, and full WCAG contrast compliance.
- **Button** (`Button.tsx`): High-reusability button supporting multiple visual variants (primary, secondary, outline, danger, ghost), sizes, and loading states.
- **Card** (`Card.tsx` / `Card.test.tsx`): Container box styled consistently with modern borders, background transitions, and padding rules.
- **ColorInput** (`ColorInput.tsx` / `ColorInput.test.tsx`): A specialized, keyboard-accessible text and visual picker element for hex colors with WCAG 2.1 SC 1.4.11 compliant hover states.
- **FieldWrapper** (`FieldWrapper.tsx`): Form layout primitive that automatically renders labels, assistive descriptions, character counts, and error states.
- **FormBlock** (`FormBlock.tsx` / `FormBlock.test.tsx`): Structural wrapper to organize form fields, titles, and action grids neatly.
- **FormFields** (`FormFields.tsx`): Standard field grouping configurations with WCAG 2.1 SC 1.4.11 compliant border boundaries.
- **JsonLdScript** (`JsonLdScript.tsx`): Secure utility component that safely injects structural SEO schema metadata.
- **Modal** (`Modal.tsx` / `Modal.test.tsx`): Accessibility-compliant dialog component complete with focus traps, exit listeners, and smooth animations.
- **PatternModule** (`PatternModule.tsx`): Visual sub-module used to configure and showcase QR pattern variants, rendering customized preview shapes including fluid bezier curves for Fluid Ink.
- **RangeInput** (`RangeInput.tsx` / `RangeInput.test.tsx`): **Mandatory slider control component** supporting minimum, maximum, step-size configuration, and granular visual previews.
- **SanitizedHtml** (`SanitizedHtml.tsx`): Safe, sanitized HTML injection system to avoid cross-site scripting (XSS) issues in dynamically parsed rich content.
- **TextField** (`TextField.tsx`): Standard form text input primitive with full validation styles and focus rings.
- **Toast** (`Toast.tsx` / `Toast.test.tsx`): Auto-dismissing alerts that slide into view to acknowledge user actions without interrupting their workflow, with a safe fallback mock context when running outside a provider (e.g., in unit tests).
- **ToggleSwitch** (`ToggleSwitch.tsx` / `ToggleSwitch.test.tsx`): Accessible sliding checkbox switch used for toggle-only options with 3:1 non-text contrast tracks in both active and inactive states.

---

## 2. QR Input Form Panel Components (`src/components/inputs/`)

These components capture specialized data structures required to construct distinct QR code types. They rely entirely on primitive UI inputs.

- **EmailInput** (`EmailInput.tsx`): Standard email layout supporting recipient, subject, and body message fields.
- **EventInput** (`EventInput.tsx`): Calendar appointment configuration form specifying title, times, description, and venue.
- **LocationInput** (`LocationInput.tsx` / `LocationInput.test.tsx`): High-accuracy coordinate form requiring proper latitude and longitude decimals.
- **MeetingInput** (`MeetingInput.tsx` / `MeetingInput.test.tsx`): Specialized input fields to enter URL links and meeting passwords.
- **PaymentInput** (`PaymentInput.tsx`): Cryptocurrency checkout fields validating address formats and value sizes.
- **PhoneInput** (`PhoneInput.tsx`): Clean, accessible phone dial code layout.
- **SmsInput** (`SmsInput.tsx`): SMS composer form holding receiver number and predefined message.
- **SocialInput** (`SocialInput.tsx` / `SocialInput.test.tsx`): Selectors for major platforms alongside handler name parsing.
- **TextInput** (`TextInput.tsx`): Minimalist form component capturing standard unformatted text.
- **TypeSelector** (`TypeSelector.tsx` / `TypeSelector.test.tsx`): Accessible tabbed layout for switching between QR configurations, with arrow, Home, End, Enter, and Space keyboard controls while leaving Tab navigation to the browser's native focus order and performing in-SPA type switching.
- **UrlInput** (`UrlInput.tsx` / `UrlInput.test.tsx`): Text input with automatic verification and correction of URL protocol schemes, featuring Cloudflare Turnstile bot verification safeguards, an integrated opt-in toggle, and explicit consent modal for dynamic tracking and edge redirection with dual-platform App Store destinations for iOS and Android.
- **VCardInput** (`VCardInput.tsx`): Extensive contact form detailing names, organization, email, phone, and address.
- **WifiInput** (`WifiInput.tsx`): Wireless network panel specifying SSID, passwords, and security type.

---

## 3. Styling & Customization Controls (`src/components/style-controls/`)

Unified appearance control modules that manage and present customization options in a modular side navigation menu.

- **AdvancedControls** (`AdvancedControls.tsx`): Advanced visual overrides such as grid density, scannability modifiers, and playable maze overlay settings including scannability-audited finder pattern bridges and style-adaptive path width range controls with WCAG compliant sliders.
- **BorderControls** (`BorderControls.tsx` / `BorderControls.test.tsx`): Controls options for border thickness, padding, and corner radius around outputs.
- **ColorControls** (`ColorControls.tsx`): Consolidates pickers and preset buttons for foreground, background, and corner eye accents.
- **ContrastWarning** (`ContrastWarning.tsx`): Dynamic accessibility banner that displays contrast warnings if combinations fall below WCAG parameters.
- **LayoutControls** (`LayoutControls.tsx` / `LayoutControls.test.tsx`): Controls size, padding, margin, and output format.
- **LogoControls** (`LogoControls.tsx`): Coordinates uploading custom logos, configuring scaling boundaries, and adjusting background-mask thresholds.
- **PatternControls** (`PatternControls.tsx`): Pattern-style selector that conditionally displays one assertive scannability warning for low-reliability patterns, avoiding duplicate screen-reader announcements.

---

## 4. Shared Utilities & Renderers (`src/utils/colorUtils.ts`, `src/utils/a11y.ts`, & `src/utils/qr-renderers/`)

These utility functions handle hex conversion, relative luminance, contrast checks, and specialized QR module canvas drawing routines. **Do not write custom math, hex formatting, or bespoke path-drawing logic under any circumstances.**

- `normalizeHex(val: string): string | null` (`src/utils/colorUtils.ts`)
  - **Description:** Normalizes custom hex inputs (supports shorthand `#abc`, converts to `#aabbcc`, formats casing, and appends a `#` prefix if absent).
- `getContrastRatio(fg: string, bg: string): number` (`src/utils/colorUtils.ts`)
  - **Description:** Computes the contrast ratio between foreground and background sRGB colors based on WCAG 2.0 relative luminance formulas.
- `renderModules` (`src/utils/qr-renderers/modules.ts`)
  - **Description:** Central vector module drawing orchestrator executing batched two-pass drawing across standard, geometric, and artistic styles.
- `renderFluidModules` (`src/utils/qr-renderers/fluid.ts`)
  - **Description:** High-performance fluid vector renderer evaluating 4-neighbor matrix module connectivity to draw continuous bezier curve bridges for the Fluid Ink style without impacting corner finder patterns.

---

## 5. Development Guardrails: Guidelines for Reuse

To avoid duplicate controls and logical divergence:

1.  **Do Not Create Custom Sliders:** All range selectors must be configured via the existing `RangeInput` component.
2.  **Do Not Duplicate Pickers:** All color pickers must rely on `ColorInput` and its internal validators.
3.  **Do Not Code Custom Color Math:** Do not write custom contrast checks, relative luminance weights, or hex parsers. Import `normalizeHex` or `getContrastRatio` directly from `src/utils/colorUtils.ts`.
4.  **Audit Before Submitting:** If you are building a new feature, compare the required controls against this index. If a component matches, import and wrap it instead of replicating it.
