# Design System Visual Style Guide

## Overview

This visual style guide documents the central design tokens, color configurations, and visual guidelines for the QRCraftly application. Developers and designers should refer to this document to maintain visual consistency across all components and themes.

## Color Design Tokens

The application relies on color tokens defined in `src/colors.json`. These include slate, teal, rose, and indigo scales to provide cohesive UI themes:

- **White**: `#ffffff`
- **Black**: `#000000`
- **Teal Scale**:
  - `teal-100`: `#ccfbf1`
  - `teal-400`: `#2dd4bf`
  - `teal-600`: `#0d9488`
  - `teal-700`: `#0f766e`
  - `teal-900`: `#134e4a`
- **Rose Scale**:
  - `rose-100`: `#ffe4e6`
  - `rose-400`: `#fb7185`
  - `rose-600`: `#e11d48`
  - `rose-700`: `#be123c`
  - `rose-900`: `#881337`
- **Indigo Scale**:
  - `indigo-100`: `#e0e7ff`
  - `indigo-400`: `#818cf8`
  - `indigo-600`: `#4f46e5`
  - `indigo-700`: `#4338ca`
  - `indigo-900`: `#312e81`

## Color Presets

We support multiple pre-configured color palettes to ensure high-contrast and aesthetically pleasing output for users:

1. **Classic**: Background `#ffffff`, Foreground `#000000`, Eye `#000000`
2. **Slate**: Background `#f8fafc`, Foreground `#334155`, Eye `#0f172a`
3. **Teal Brand**: Background `#ffffff`, Foreground `#0f766e`, Eye `#115e59`
4. **Royal Blue**: Background `#eff6ff`, Foreground `#1e40af`, Eye `#172554`
5. **Midnight**: Background `#020617`, Foreground `#f8fafc`, Eye `#38bdf8`
6. **Forest**: Background `#f0fdf4`, Foreground `#166534`, Eye `#14532d`
7. **Rose**: Background `#fff1f2`, Foreground `#9f1239`, Eye `#881337`
8. **Purple**: Background `#faf5ff`, Foreground `#6b21a8`, Eye `#581c87`
9. **Cyber**: Background `#27272a`, Foreground `#e4e4e7`, Eye `#facc15`

## Visual Styling Guidelines

1. **Contrast Compliance**: Ensure a minimum contrast ratio of 4.5:1 for standard text and 3:1 for large text against backgrounds.
2. **Focus Indicators**: Always use explicit visual styles (e.g., ring outline using `indigo-600` or `teal-600`) for interactive elements.
3. **Responsive Scaling**: Elements must adapt smoothly across a range of device viewports without losing functional clarity or text readability.
