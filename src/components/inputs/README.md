# Input Components

This directory contains modular React components for each specific QR code data type. These components are orchestrated by `src/components/InputPanel.tsx`.

## Component Pattern

Each input component follows a consistent pattern:

1.  **Strict Props**: Takes a `data` object (specific to the type, e.g., `WifiData`) and an `onChange` handler.
2.  **Stateless (Mostly)**: Typically delegates state management to the parent (`InputPanel`) via `useQRInputState`, though some may handle purely UI-local state (like toggling password visibility).
3.  **Shared Styles**: Uses centralized style constants from `styles.ts` to ensure visual consistency.

### Example Structure

```tsx
interface WifiInputProps {
  data: WifiData;
  onChange: (updates: Partial<WifiData>) => void;
}

export const WifiInput: React.FC<WifiInputProps> = ({ data, onChange }) => {
  // ... JSX for inputs
};
```

## Available Components

- `TypeSelector.tsx`: The grid of icons for selecting the QR type.
- `UrlInput.tsx`: For `QRType.URL`. Handles URL validation and sanitization.
- `TextInput.tsx`: For `QRType.TEXT`. Includes character counting.
- `WifiInput.tsx`: For `QRType.WIFI`. Handles SSID, password, encryption type, and hidden network flags.
- `EventInput.tsx`: For `QRType.EVENT`. Builds iCalendar-compatible event payloads.
- `EmailInput.tsx`: For `QRType.EMAIL`. Fields for address, subject, and body.
- `VCardInput.tsx`: For `QRType.VCARD`. Complex form for contact details.
- `PhoneInput.tsx`: For `QRType.PHONE`. Simple phone number input.
- `SmsInput.tsx`: For `QRType.SMS`. Phone number and message body.
- `PaymentInput.tsx`: For `QRType.PAYMENT`. Supports Bitcoin, Ethereum, Solana, etc.

## Adding a New Input Type

1.  Define the data structure in `src/types.ts`.
2.  Create a construction helper in `src/utils/qrHelpers.ts`.
3.  Create a new component file in this directory (e.g., `NewTypeInput.tsx`).
4.  Import and add the component to the conditional rendering block in `src/components/InputPanel.tsx`.
5.  Add the new type to the `TypeSelector` options.
