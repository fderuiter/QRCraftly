# QRCraftly

[![CI/CD Pipeline](https://github.com/fderuiter/QRCraftly/actions/workflows/main.yml/badge.svg)](https://github.com/fderuiter/QRCraftly/actions/workflows/main.yml)

**[Visit the production site: https://qrcraftly.com](https://qrcraftly.com)**

[QRCraftly](https://qrcraftly.com) is a powerful, privacy-focused, and user-friendly React application for generating customized QR codes. It supports various data types including URLs, text, WiFi credentials, vCards, emails, and crypto payments. Users can extensively customize the appearance of their QR codes, including colors, patterns, and embedded logos, all while ensuring data privacy through client-side processing.

## Features

- **Multiple Data Types**: Generate QR codes for URLs, plain text, WiFi networks (WPA/WEP/EAP/Open), Email, vCard contacts, Phone numbers, SMS, and Cryptocurrency payments.
- **Visual Customization**:
    - **Patterns**: Choose from Classic Squares, Modern Dots, Rounded, Diamond, Swiss Cross, Star, and Heart styles.
    - **Colors**: Customize foreground, background, and corner eye colors. Includes accessibility-checked preset themes.
    - **Logos**: Upload and embed custom logos with configurable padding, sizes, and border styles (Square, Circle, None).
- **Privacy First**: Client-side architecture. All sensitive data processing happens in your browser; no user data is sent to a server without your explicit opt-in for telemetry.
- **Advanced Architecture**:
    - **Scannability Web Workers**: Real-time QR code scannability and contrast testing runs on a background Web Worker, ensuring the UI remains jank-free during rapid edits.
    - **Client-Side SVG Export**: Features a custom `SvgContext` that mimics the Canvas 2D API to generate high-quality, resolution-independent vector graphics directly in the browser.
- **Live Preview**: See your changes instantly as you edit.
- **Download & Share**:
    - Save as high-quality PNG, JPEG, WebP, or vector SVG.
    - Native "Save As" support via File System Access API.
    - Web Share API integration for mobile sharing.
- **Accessibility**:
    - WCAG contrast checks for generated codes.
    - Fully accessible UI with keyboard navigation and screen reader support.
- **Compliance**:
    - Privacy-first architecture aligned with [HIPAA Technical Safeguards](docs/public/COMPLIANCE.md).
- **Dark Mode**: Fully supported dark mode interface.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 22.14.0 or higher required)
- [pnpm](https://pnpm.io/) (strictly mandated, do not use `npm` or `yarn`)

**System Dependencies (Linux/WSL/macOS):**

This project uses `node-canvas` for testing (via JSDOM). Because `pnpm install` installs development dependencies by default, **you must install these system libraries before running `pnpm install`** or the installation will fail.

*   **Ubuntu/Debian:**
    ```bash
    sudo apt-get update
    sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
    ```

*   **macOS:**
    ```bash
    brew install pkg-config cairo pango libpng jpeg giflib librsvg
    ```

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/fderuiter/QRCraftly.git
    cd QRCraftly
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

### Running the Application

To start the development server:

```bash
pnpm dev
```

The application will typically start at `http://localhost:3000` (or another available port shown in the terminal).

### Building for Production

To create a production-ready build (Static Site Generation via Vike):

```bash
pnpm build
```

The build artifacts will be stored in the `dist/` directory.

To preview the production build locally:

```bash
pnpm preview
```

### Running Tests

To run the unit test suite (Vitest):

```bash
pnpm test
```

To run coverage reports:
```bash
pnpm test -- run --coverage
```

To run End-to-End (E2E) tests (Playwright):

Note: On a fresh environment, you must install the required browsers first.
```bash
pnpm exec playwright install
pnpm test:e2e
```

### Local Verification

This project enforces strict quality checks in CI. Run the complete quality suite locally to prevent build failures. This combined script performs linting, type-checking, and accessibility verification matching the CI pipeline logic:

```bash
pnpm run lint
```

**Bundle Size Check:**
The build pipeline enforces a 3MB limit on the client bundle.
```bash
pnpm build
# Check size of dist/client directory
du -sh dist/client
```

**Performance & SEO:**
Lighthouse CI runs on every Pull Request to audit performance, accessibility, best practices, and SEO.

## Troubleshooting

### `pnpm install` fails with `gyp ERR!` or `Package cairo was not found`

This usually happens because `node-canvas` (a development dependency used for testing) requires system-level libraries to be installed.

**Solution:**
1. Install the system dependencies listed in the [Prerequisites](#prerequisites) section for your operating system.
2. Run `pnpm install` again.

Alternatively, if you only want to run the application without running tests, you can skip installing development dependencies:

```bash
pnpm install --prod
```

## Usage Guide

1.  **Select Content Type**: Use the icon grid at the top of the input panel to choose the type of QR code you want to create (e.g., URL, WiFi).
2.  **Enter Data**: Fill in the required fields for the selected type. The QR code preview will update automatically.
3.  **Customize Appearance**:
    - Scroll down to the "Appearance" section.
    - Select a **Pattern Style**.
    - Choose a **Color Preset** or manually adjust the Foreground, Background, and Eye colors.
    - *Tip*: Watch out for the "Low Contrast" warning to ensure your QR code is scannable.
4.  **Add a Logo (Optional)**:
    - Click "Upload Logo" to add an image to the center of the QR code.
    - Adjust the logo size, border style, and padding.
5.  **Download**:
    - Click the **Download** button to save as a high-quality PNG.
    - Click the arrow next to Download to choose other formats (JPEG, WebP).
    - Use "Save to Photos" on mobile devices or "Share" to send it to other apps.

## Project Structure

- `src/`: Source code.
    - `components/`: Reusable React components.
        - `InputPanel.tsx`: Main controller for data input; orchestrates sub-components.
        - `inputs/`: Modular input components for each QR type (e.g., `WifiInput`, `VCardInput`).
        - `StyleControls.tsx`: UI for customizing colors, patterns, and logos.
        - `QRCanvas.tsx`: The core component that renders the QR code using HTML5 Canvas.
        - `QRTool.tsx`: The main container component that integrates inputs, controls, and canvas.
    - `layouts/`: Application layouts.
        - `LayoutDefault.tsx`: The main layout wrapper.
        - `Head.tsx`: Manages document head elements.
    - `pages/`: Page-level components (Vike routing).
        - `index/+Page.tsx`: The home page.
        - `about/+Page.tsx`: The about page.
        - `wifi-qr-code/+Page.tsx`: Specialized WiFi QR code page.
        - `+config.ts`: Global Vike configuration.
    - `types.ts`: TypeScript definitions for application state and data structures.
    - `constants.ts`: Default configurations and preset data.
- `scripts/`: Utility scripts.
    - `contrast_check.js`: Checks WCAG contrast compliance for UI elements.
- `public/`: Static assets (favicon, etc.).

## Contributor Guide for Dependencies

To maintain security and reduce repository noise, QRCraftly uses **Dependabot** to manage third-party dependencies.

- **Automated Scanning**: Dependabot checks for outdated packages daily and monitors for security vulnerabilities.
- **Grouped Updates**: Non-security routine updates are consolidated into logical groups (e.g., `dev-dependencies`, `production-dependencies`) to minimize PR volume.
- **Security Priority**: Critical security patches bypass routine grouping and are issued as isolated PRs for immediate visibility.
- **Review Process**: All dependency update PRs require human review. Before merging, ensure the CI pipeline (`test`, `e2e`, `quality`, and bundle size checks) has passed successfully.
- **Package Manager**: QRCraftly strictly mandates **pnpm**. Dependabot is configured to respect `pnpm-lock.yaml`. Never use `npm install` or `yarn` when manually updating dependencies.

## Technologies Used

- **React 19**: UI library.
- **TypeScript**: Static typing for better code quality.
- **Vite 6**: Fast build tool and development server.
- **Vike**: Server-side rendering and routing framework.
- **Tailwind CSS v4**: Utility-first CSS framework for styling.
- **qrcode**: Library for generating QR code module data.
- **Lucide React**: Icon set.
- **Vitest**: Testing framework.

## Styling and Theme Configuration

QRCraftly uses **Tailwind CSS v4**, which introduces a streamlined CSS-first configuration model. The legacy `tailwind.config.js` file is obsolete and has been removed to maintain a single source of truth for all styling.

All custom styling, theme extensions, and Tailwind configurations are now managed directly in the main CSS entrypoint: `src/layouts/index.css`.

### How to Manage Styles
- **Theme Variables**: To add custom brand colors, breakpoints, fonts, or other theme extensions, define them inline in `src/layouts/index.css` using the `@theme` directive.
- **Dark Mode**: The class-based dark mode is configured using a custom variant directly in the CSS (`@variant dark (&:where(.dark, .dark *));`), replacing the legacy JS configuration.
- **Utility Classes**: Continue writing standard Tailwind utility classes in your React components. The PostCSS setup will automatically handle processing via the `@tailwindcss/postcss` plugin.

For developers customizing the UI or extending the design system, `src/layouts/index.css` is the definitive file to modify.

## License

[AGPL-3.0](LICENSE.md)
