---
publish-approved: true
audience: developers # internal developer documentation, not published on /security
---

# Design System Visual Style Guide

## Overview

This visual style guide documents the design system tokens, color palettes, and styling conventions for QRCraftly. The application adopts a modern, pure CSS-first Tailwind CSS v4 architecture that replaces legacy JavaScript configuration files with native CSS directives.

All developers and AI agents must consult this guide alongside [`UI_CATALOG.md`](UI_CATALOG.md) to preserve visual harmony, consistent keyboard accessibility, and WCAG compliance.

---

## 1. Tailwind CSS v4 (CSS-First Architecture)

QRCraftly uses Tailwind CSS v4 without a `tailwind.config.js` file:

- **Root Stylesheet**: All theme configurations, variants, and base layer styles live exclusively in `src/layouts/index.css`.
- **Dark Mode Variant**: Declared via `@variant dark (&:where(.dark, .dark *));` to support class-based dark mode toggling.
- **Utility Class Formatting**: Standard class ordering is enforced via `pnpm run format:classes` and Prettier.

---

## 2. Design Tokens

`src/layouts/index.css` defines the token layer in one `@theme` block (#1045). Components use the semantic names, never raw palette steps: `scripts/design_token_audit.js` (part of `pnpm run lint`) rejects raw palette colours in `src/components/ui/` and arbitrary colour or size values (`text-[11px]`, `bg-[#0a0f1d]`) anywhere in `src/`. Pages still carry some raw palette classes; move them to tokens when you touch them.

Colour roles are CSS variables. A `.dark` block redefines their values, so a component writes `bg-surface text-fg` once and needs no `dark:` variant.

| Role           | Utility                                                                     | Light                  | Dark                              | Use                                                   |
| -------------- | --------------------------------------------------------------------------- | ---------------------- | --------------------------------- | ----------------------------------------------------- |
| Page           | `bg-page`                                                                   | slate-50               | slate-950                         | The one page background on every route                |
| Surface        | `bg-surface`                                                                | white                  | slate-900                         | Panels, cards, form fields, headers, footers          |
| Raised surface | `bg-surface-raised`                                                         | white                  | slate-800                         | Menus, popovers, accordions, outline buttons          |
| Sunken surface | `bg-surface-sunken`                                                         | slate-50               | slate-950                         | Wells inside a surface                                |
| Hover          | `bg-surface-hover`                                                          | slate-100              | slate-800                         | Hover state of rows, menu items, quiet buttons        |
| Scrim          | `bg-scrim`                                                                  | black 50%              | black 50%                         | Modal backdrop                                        |
| Lines          | `border-line-subtle`, `border-line`, `border-line-strong`                   | slate-100, 200, 600    | slate-800, 700, 400               | Dividers, outlines, form controls (3:1)               |
| Text           | `text-fg`, `text-fg-soft`, `text-fg-muted`                                  | slate-900, 700, 600    | slate-100, 300, 400               | Headings, body, secondary text                        |
| Accent         | `text-accent`, `text-accent-strong`, `bg-accent-soft`, `border-accent-line` | teal-700, 800, 50, 200 | teal-400, 300, 950, 800           | Brand text, icons, selected and info tints            |
| Action         | `bg-action`, `hover:bg-action-hover`, `text-on-action`                      | teal-700, 800, white   | same                              | Filled primary buttons                                |
| Danger         | `text-danger`, `bg-danger-soft`, `border-danger-line`, `bg-danger-action`   | rose-700, 50, 200, 700 | rose-400, rose-900 30%, 800, 700  | Errors and destructive actions (rose only; never red) |
| Success        | `text-success`, `bg-success-soft`, `border-success-line`                    | emerald-800, 50, 200   | emerald-300, emerald-900 30%, 800 | Success messages                                      |
| Warning        | `text-warning`, `bg-warning-soft`, `border-warning-line`                    | amber-800, 50, 200     | amber-400, amber-950 30%, 900     | Warnings                                              |
| Focus          | `ring-focus`                                                                | teal-700               | teal-400                          | The one keyboard focus ring                           |

The brand scale is also available as `brand-50` to `brand-950` (teal). Indigo is not used anywhere.

Other tokens in the same block:

- **Type scale**: `text-xs` (12px, the floor for any text) through `text-4xl`, with line heights. `font-display` and `font-mono` are system font stacks; there are no web fonts.
- **Radius**: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl` and `rounded-full`.
- **Elevation**: `shadow-raised` (cards, primary buttons), `shadow-overlay` (menus, toasts), `shadow-modal` (dialogs), plus the effects `shadow-glow` (scanner laser) and `shadow-spotlight` (camera viewfinder).
- **Motion**: `duration-(--duration-fast)` 150ms, `duration-(--duration-base)` 200ms, `duration-(--duration-slow)` 300ms, and the easings `ease-standard` and `ease-emphasized`.

`src/colors.json` records the hex values of the palette steps behind these roles for the contrast checker (`scripts/contrast_check.js`), which checks every text and non-text token pair in both themes.

---

## 3. High-Contrast Color Presets

Pre-configured palettes for generated QR codes ensure high contrast, aesthetic balance, and scannability:

1. **Classic**: Background `#ffffff`, Foreground `#000000`, Eye `#000000`
2. **Slate**: Background `#f8fafc`, Foreground `#334155`, Eye `#0f172a`
3. **Teal Brand**: Background `#ffffff`, Foreground `#0f766e`, Eye `#115e59`
4. **Royal Blue**: Background `#eff6ff`, Foreground `#1e40af`, Eye `#172554`
5. **Midnight**: Background `#020617`, Foreground `#f8fafc`, Eye `#38bdf8`
6. **Forest**: Background `#f0fdf4`, Foreground `#166534`, Eye `#14532d`
7. **Rose**: Background `#fff1f2`, Foreground `#9f1239`, Eye `#881337`
8. **Purple**: Background `#faf5ff`, Foreground `#6b21a8`, Eye `#581c87`
9. **Cyber**: Background `#27272a`, Foreground `#e4e4e7`, Eye `#facc15`

---

## 4. Accessibility and Interaction Standards

1. **WCAG 2.1 SC 1.4.3 Contrast (Text)**: Maintain a minimum contrast ratio of 4.5:1 for standard body text and 3:1 for large headings against background surfaces.
2. **WCAG 2.1 SC 1.4.11 Non-Text Contrast**: Visual boundaries, active toggle states, form borders, and focus rings must maintain at least a 3:1 contrast ratio against adjacent backgrounds.
3. **Keyboard Focus Rings**: Interactive elements must feature unambiguous, high-contrast focus indicators (`ring-2 ring-focus ring-offset-2`, an offset ring that stays distinct from the filled tint used for selected states) when focused via keyboard navigation, while suppressing outline rings on mouse click via `:focus:not(:focus-visible)`.
4. **Motion Preferences**: Animations and transitions must respect `prefers-reduced-motion: reduce`.
