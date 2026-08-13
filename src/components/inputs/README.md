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

- `TypeSelector.tsx`: The grid of icons for selecting the QR type. Employs standard WAI-ARIA tablist semantics, roving tabIndex focus cycle, and Arrow/Tab keydown navigation.
- `UrlInput.tsx`: For `QRType.URL`. Handles URL validation and sanitization.
- `TextInput.tsx`: For `QRType.TEXT`. Includes character counting.
- `WifiInput.tsx`: For `QRType.WIFI`. Handles SSID, password, encryption type, and hidden network flags.
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
2.  Create construction, hydration, and parsing helpers in `src/utils/qrHelpers.ts`.
3.  Create a new component file in this directory (e.g., `NewTypeInput.tsx`).
4.  Register the component, its initial state, and helpers in `src/components/inputs/InputRegistry.ts`.
5.  Add the new type to the `TypeSelector` options.

## QR Animation & Style Configurations

The centralized config structure in `src/types.ts` has optional fields for `animationValues`, `isAnimating`, and `animationFps` to drive high-performance frame playbacks in the canvas, as well as `isCompensationEnabled` to control adaptive geometric style adjustments.

## Dual-Mode QR Scanner Integration

The `InputPanel` features an integrated, high-performance dual-mode QR Code Scanner:

1. **Live Webcam Viewfinder**: Uses a custom `useCamera` hook to acquire media streams and robustly handles permission rejections (`NotAllowedError`) without throwing unhandled promise exceptions. Decodes real-time camera frames smoothly using the `useAdaptiveScanner` loop backpressure mechanism.
2. **Client-Side File Upload Fallback**: If camera permissions are blocked or hardware is unavailable, displays an interactive troubleshooting card with platform-specific recovery instructions. Users can instantly transition to file upload mode to drag and drop or select QR code images for client-side decoding using `jsQR`. This guarantees user privacy by avoiding any external server transmissions.
