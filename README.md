# QRCraftly

QRCraftly is a powerful and user-friendly React application for generating customized QR codes. It supports various data types including URLs, text, WiFi credentials, vCards, emails, and more. Users can extensively customize the appearance of their QR codes, including colors, patterns, and embedded logos.

## Features

- **Multiple Data Types**: Generate QR codes for URLs, plain text, WiFi networks, Email, vCard contacts, Phone numbers, and SMS.
- **Visual Customization**:
    - **Patterns**: Choose from Classic Squares, Modern Dots, Rounded, Diamond, and Swiss Cross styles.
    - **Colors**: Customize foreground, background, and corner eye colors. Includes preset themes.
    - **Logos**: Upload and embed custom logos with configurable padding and border styles (Square, Circle).
- **Live Preview**: See your changes instantly as you edit.
- **Download Options**: Save your QR codes as PNG, JPEG, or WebP formats.
- **Dark Mode**: Fully supported dark mode interface.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 14 or higher recommended)
- npm (usually comes with Node.js) or yarn
- Python 3 (optional, for running utility scripts)

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

To create a production-ready build:

```bash
npm run build
# or
yarn build
```

The build artifacts will be stored in the `dist/` directory.

### Running Tests

To run the test suite:

```bash
npm test
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

- `App.tsx`: The main application component managing global state.
- `components/`: Contains reusable UI components.
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
- `types.ts`: TypeScript definitions for application state and data structures.
- `constants.ts`: Default configurations and preset data.
- `scripts/`: Utility scripts.
    - `contrast_check.py`: Python script to verify WCAG contrast compliance for UI elements.

## Technologies Used

- **React**: UI library.
- **TypeScript**: Static typing for better code quality.
- **Vite**: Fast build tool and development server.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **node-qrcode**: Library for generating QR code data.
- **Lucide React**: Icon set.
- **Vike**: Server-side rendering and routing framework (formerly vite-plugin-ssr).

## License

[AGPL-3.0](LICENSE.md)
