# Input Components

This directory contains modular React components for each specific QR code data type. These components are orchestrated by `src/components/InputPanel.tsx`.

## Component Pattern

Each input component follows a consistent pattern:

1.  **Strict Props**: Takes a `data` object (specific to the type, e.g., `WifiData`) and an `onChange` handler.
2.  **Stateless (Mostly)**: Typically delegates state management to the parent (`InputPanel`) via `useInputLogic` and the centralized registry, though some may handle purely UI-local state (like toggling password visibility or geolocation loading).
3.  **Shared Styles**: Uses centralized style constants from `styles.ts` to ensure visual consistency.

### Example Structure

```tsx
import React from 'react';
import { WifiData } from '../../types';

interface WifiInputProps {
  data: WifiData;
  onChange: (updates: Partial<WifiData>) => void;
}

export const WifiInput: React.FC<WifiInputProps> = ({ data, onChange }) => {
  return (
    <input
      type="text"
      value={data.ssid}
      onChange={(e) => onChange({ ssid: e.target.value })}
    />
  );
};
```

## Available Components

- `TypeSelector.tsx`: The grid of QR types. Each type has its own SEO route (`QR_TYPE_ROUTES` in `src/data/navigation.ts`), so the choices are ordinary links inside a labelled `nav` list, with `aria-current="page"` on the current route. There are no tab roles, no roving tabIndex and no arrow-key interception: Tab moves through the links in document order. Choosing a type is a normal navigation; the URL, metadata, selected link and input panel all come from the route. Nothing is cleared before navigation, and QR content is not carried to the next route or persisted (volatile memory guarantee). Appearance-only settings (colours, style, layout; not content or free text such as template headlines) are carried to the next generator route in memory only, via `QRProvider retainAppearance`.
- `UrlInput.tsx`: For `QRType.URL`. Handles URL validation and sanitization.
- `TextInput.tsx`: For `QRType.TEXT`. Includes character counting.
- `WifiInput.tsx`: For `QRType.WIFI`. Handles SSID, password, encryption type, hidden network flags, and (for WPA2-Enterprise) the EAP method (`E:`), phase 2 authentication (`PH2:`) and identity (`I:`) fields.
- `EventInput.tsx`: For `QRType.EVENT`. Builds iCalendar-compatible event payloads.
- `EmailInput.tsx`: For `QRType.EMAIL`. Fields for address, subject, and body.
- `VCardInput.tsx`: For `QRType.VCARD`. Complex form for contact details.
- `PhoneInput.tsx`: For `QRType.PHONE`. Simple phone number input.
- `SmsInput.tsx`: For `QRType.SMS`. Phone number and message body.
- `PaymentInput.tsx`: For `QRType.PAYMENT`. Supports Bitcoin, Ethereum, Solana, etc.
- `LocationInput.tsx`: For `QRType.LOCATION`. Collects latitude and longitude with support for browser geolocation APIs.
- `MeetingInput.tsx`: For `QRType.MEETING`. Handles online meeting links for Zoom, Microsoft Teams, and Google Meet, with automatic parsing.
- `SocialInput.tsx`: For `QRType.SOCIAL`. Configures social media platform username and handle details for Instagram, Twitter / X, and TikTok.

## Adding a New Input Type

1.  Define the data structure in `src/types.ts`.
2.  Create the payload generator (construction, hydration, and parsing) in `src/packages/qr-payload/lib/generators/` and register it in `src/packages/qr-payload/lib/registry.ts`. Import generators from `@/packages/qr-payload`; there is no `utils` shim.
3.  Create a new component file in this directory (e.g., `NewTypeInput.tsx`).
4.  Register the component, its initial state, and helpers in `src/components/inputs/InputRegistry.ts`.
5.  Add the new type to the `TypeSelector` options and its route to `QR_TYPE_ROUTES` in `src/data/navigation.ts` (with a matching page under `src/pages/`).
6.  Add its display name to `QR_TYPE_LABELS` in `src/components/InputPanel.tsx`. Announcements ("WiFi input loaded") and the scan toast ("Type detected: vCard contact") use these labels, never raw enum values.

## QR Animation Configurations

The centralized config structure in `src/types.ts` has optional fields for `animationValues`, `isAnimating`, and `animationFps` to drive high-performance frame playbacks in the canvas.

## Dual-Mode QR Scanner Integration

The `InputPanel` features an integrated, high-performance dual-mode QR Code Scanner:

1. **Live Webcam Viewfinder**: Uses a custom `useCamera` hook to acquire media streams and robustly handles permission rejections (`NotAllowedError`) without throwing unhandled promise exceptions. Decodes real-time camera frames through the `useQrScanner` hook (`@/packages/optical-scanner/client`), which wraps the Camera Scanner Engine and its backpressure handling.
2. **Client-Side File Upload Fallback**: If camera permissions are blocked or hardware is unavailable, displays an interactive troubleshooting card with platform-specific recovery instructions. Users can instantly transition to file upload mode to drag and drop or select QR code images for client-side decoding using `jsQR`. This guarantees user privacy by avoiding any external server transmissions.
3. **Mode Switch**: Webcam and File Upload are a `Button` group with `aria-pressed`, so the selected mode is announced; the upload dropzone is a `Button` whose file input sits outside it.
4. **Accessible Keyboard Navigation**: The scanner toggle action is positioned directly after the dynamic input panel, ensuring natural forward Tab sequences flow seamlessly into the active input fields before reaching secondary scanner actions.

## Playable Maze Overlay Configuration

The centralized configuration in `src/types.ts` also contains parameters for generating a solvable maze overlay directly on the QR code:

- `isMazeEnabled`: Enables/disables maze overlay rendering.
- `isMazeBridgesEnabled`: Enables scannability-audited bridge channels in maze generation.
- `mazeColor`: Sets maze path color.
- `mazePathWidth`: Controls maze path width.
- `showMazeSolution`: Toggles solved path visibility.

These parameters are controlled via `AdvancedControls.tsx`.

## Template Export Configuration

Template export options in `QRConfig` include `templateStyle`, optional `templateHeadline`/`templateSubtext`, color overrides (`templateBgColor`, `templateTextColor`), and `templateQrScale`.
