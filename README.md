# QRCraftly

QRCraftly is a powerful, privacy-focused, and user-friendly React application for generating customized QR codes. It supports various data types including URLs, text, WiFi credentials, vCards, emails, and crypto payments. Users can extensively customize the appearance of their QR codes, including colors, patterns, and embedded logos, all while ensuring data privacy through client-side processing.

## Features

- **Multiple Data Types**: Generate QR codes for URLs, plain text, WiFi networks (WPA/WEP/EAP/Open), Email, vCard contacts, Phone numbers, SMS, and Cryptocurrency payments.
- **Visual Customization**:
    - **Patterns**: Choose from Classic Squares, Modern Dots, Rounded, Diamond, Swiss Cross, Star, and Heart styles.
    - **Colors**: Customize foreground, background, and corner eye colors. Includes accessibility-checked preset themes.
    - **Logos**: Upload and embed custom logos with configurable padding, sizes, and border styles (Square, Circle, None).
- **Privacy First**: Zero Knowledge architecture. All data processing happens in your browser; no user data is sent to a server.
- **Live Preview**: See your changes instantly as you edit.
- **Download & Share**:
    - Save as high-quality PNG, JPEG, or WebP.
    - Native "Save As" support via File System Access API.
    - Web Share API integration for mobile sharing.
- **Accessibility**:
    - WCAG contrast checks for generated codes.
    - Fully accessible UI with keyboard navigation and screen reader support.
- **Dark Mode**: Fully supported dark mode interface.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 20.19.0 or higher required)
- npm (usually comes with Node.js) or yarn
- Python 3 (optional, for running `scripts/` utilities)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/fderuiter/QRCraftly.git
    cd QRCraftly
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Application

To start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will typically start at `http://localhost:3000` (or another available port shown in the terminal).

### Building for Production

To create a production-ready build (Static Site Generation via Vike):

```bash
npm run build
# or
yarn build
```

The build artifacts will be stored in the `dist/` directory.

### Running Tests

To run the test suite (Vitest):

```bash
npm test
```

To run coverage reports:
```bash
npm test -- run --coverage
```

## Troubleshooting

### Canvas Installation Issues
This project relies on `node-canvas` which may require system dependencies on Linux/WSL. If `npm install` fails, try installing the following packages:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
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
        - `InputPanel.tsx`: Handles data input for different QR types.
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
- `scripts/`: Utility scripts (Python).
    - `contrast_check.py`: Checks WCAG contrast compliance for UI elements.
    - `optimize_assets.py`: Optimizes static image assets (requires `pip install -r scripts/requirements.txt`).
- `public/`: Static assets (favicon, etc.).

## Technologies Used

- **React 19**: UI library.
- **TypeScript**: Static typing for better code quality.
- **Vite 6**: Fast build tool and development server.
- **Vike**: Server-side rendering and routing framework.
- **Tailwind CSS v4**: Utility-first CSS framework for styling.
- **qrcode**: Library for generating QR code module data.
- **Lucide React**: Icon set.
- **Vitest**: Testing framework.

## License

[AGPL-3.0](LICENSE.md)
