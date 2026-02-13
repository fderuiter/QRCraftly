# Shield's Journal 🛡️

## 2025-02-18 - Missing Unit Tests for Color Utility
**Discovery:** The `colorUtils.ts` file, which is critical for accessibility compliance (contrast checks), has no dedicated unit tests. It relies on integration tests in `StyleControlsContrast.test.tsx`, which don't cover edge cases or invalid inputs.
**Defense:** Created `src/utils/colorUtils.test.ts` to strictly verify `getLuminance` and `getContrastRatio` behavior, ensuring deterministic calculations and safe handling of invalid inputs.

## 2025-02-18 - Non-deterministic Canvas Drawing
**Discovery:** The `drawScribble` function in `canvasHelpers.ts` uses `Math.random()`, making it impossible to test deterministically without mocking.
**Defense:** Implemented `vi.spyOn(Math, 'random')` in `src/utils/canvasHelpers.test.ts` to force a predictable sequence of random numbers, ensuring the test passes consistently on every run.

## 2025-02-18 - [Silent Failure in Color Contrast Calc]
**Discovery:** `getContrastRatio` silently treats invalid hex strings (e.g. `#GGGGGG`) as Black (`#000000`) due to `parseInt` returning `NaN` and bitwise operators converting `NaN` to `0`. This results in a false positive contrast ratio of 21 against white, masking potential data issues.
**Defense:** Implement strict regex validation for hex strings in `getContrastRatio` to ensure invalid inputs return 0 (failure), matching the behavior for invalid lengths.

## 2025-02-18 - Flaky Canvas Tests with setTimeout
**Discovery:** `QRCanvasExtended.test.tsx` used hardcoded `setTimeout` delays (100ms, 200ms) to wait for async canvas rendering. This causes flakiness if the environment is slow, or wastes time if it's fast. It also triggered `act(...)` warnings because state updates happened outside React's test loop.
**Defense:** Replaced `setTimeout` with `waitFor` from `@testing-library/react`. This makes the test deterministic, faster, and implicitly handles async state updates correctly.

## 2025-02-18 - Unsupported 3-digit Hex in Color Utils
**Discovery:** `getContrastRatio` treated valid 3-digit hex codes (e.g., `#FFF`) as invalid inputs, returning 0 contrast. This caused false positive "Low Contrast" warnings in the UI when users manually entered short hex codes.
**Defense:** Updated `getLuminance` to expand 3-digit hex codes to 6-digit equivalents and updated `getContrastRatio` to validate and accept length-4 hex strings.

## 2025-02-18 - [URI Injection in SMS/Tel Schemas]
**Discovery:** `cleanPhoneNumber` was too permissive, allowing URI control characters (`?`, `&`, `=`) to persist. This enabled parameter injection in `sms:` and `tel:` URIs (e.g., `sms:123?body=hacked` resulting in `sms:123?body=hacked?body=hello`).
**Defense:** Updated `cleanPhoneNumber` regex to strictly strip `?`, `&`, and `=` characters, ensuring that user input in the number field cannot alter the URI structure or inject parameters.

## 2025-02-18 - [Header Injection in Email Schemas]
**Discovery:** `constructEmailString` did not sanitize newlines from email inputs, allowing attackers to inject arbitrary headers (e.g. `cc:`) into `mailto:` links via crafted input (e.g., `user@example.com\ncc:attacker`).
**Defense:** Updated `sanitizeInput` in `src/utils/security.ts` to strictly strip all control characters (0x00-0x1F, 0x7F-0x9F), neutralizing newline injection attacks across email and other URI schemes.

## 2026-02-11 - Act Warnings in Canvas Tests
**Discovery:** `QRCanvas.test.tsx` triggered multiple `act(...)` warnings because manual `img.onload` calls updated state outside the React test loop. Additionally, `QRCanvasBorder.test.tsx` used brittle `setTimeout` calls to wait for async rendering.
**Defense:** Wrapped all manual event triggers in `act(...)` and replaced `setTimeout` with `waitFor(...)` to ensure tests are deterministic and free of console noise.

## 2026-02-18 - [Unchecked Control Characters in vCard]
**Discovery:** `escapeVCardString` failed to sanitize non-printable ASCII control characters (like `\x00` or `\x1B`) from vCard fields, potentially corrupting QR code data or causing truncation in legacy readers.
**Defense:** Updated `escapeVCardString` to strip all control characters in the range `\x00-\x1F` (except Tab, LF, CR) and `\x7F-\x9F` before other processing.
