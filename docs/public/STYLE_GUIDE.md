---
publish-approved: true
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

## 2. Color Design Tokens

The application relies on color scales defined in `src/colors.json` and CSS variables in `src/layouts/index.css`:

- **Monochrome Base**:
  - `white`: `#ffffff`
  - `black`: `#000000`
- **Teal Scale (Brand Accent)**:
  - `teal-100`: `#ccfbf1`
  - `teal-400`: `#2dd4bf`
  - `teal-600`: `#0d9488`
  - `teal-700`: `#0f766e`
  - `teal-900`: `#134e4a`
- **Rose Scale (Warnings & Accents)**:
  - `rose-100`: `#ffe4e6`
  - `rose-400`: `#fb7185`
  - `rose-600`: `#e11d48`
  - `rose-700`: `#be123c`
  - `rose-900`: `#881337`
- **Indigo Scale (Focus Rings & Primary Actions)**:
  - `indigo-100`: `#e0e7ff`
  - `indigo-400`: `#818cf8`
  - `indigo-600`: `#4f46e5`
  - `indigo-700`: `#4338ca`
  - `indigo-900`: `#312e81`

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
3. **Keyboard Focus Rings**: Interactive elements must feature unambiguous, high-contrast focus indicators (`ring-2 ring-indigo-600 dark:ring-indigo-500 ring-offset-2`) when focused via keyboard navigation, while suppressing outline rings on mouse click via `:focus:not(:focus-visible)`.
4. **Motion Preferences**: Animations and transitions must respect `prefers-reduced-motion: reduce`.
