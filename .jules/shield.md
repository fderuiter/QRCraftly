# Shield's Journal 🛡️

## 2024-05-22 - [Empty Input handling in InputPanel]
**Discovery:** The `InputPanel` component has logic for cleaning phone numbers (`replace(/[\s:]+/g, '')`) and escaping characters for WiFi/vCard strings. However, there are no tests covering what happens when these inputs result in empty strings or invalid states after cleaning. For example, if a user enters only spaces in a phone number field, the cleaner will return an empty string, potentially resulting in `tel:` which might be invalid for some readers. Also, checks for boundary conditions like extremely long strings (DoS prevention context, though less critical client-side) or special characters that *shouldn't* be there but aren't escaped are implicit.
**Defense:** I will add "Sad Path" tests for `InputPanel` to verify behavior when inputs are empty, whitespace-only, or contain characters that are stripped out, ensuring the component handles these gracefully without crashing or producing malformed URIs that could break the QR generator.

## 2024-05-22 - [Escape Logic Verification]
**Discovery:** The `escapeWifiString` and `escapeVCardString` functions are tested for *some* characters, but not for all boundary cases (e.g., empty string, string with ONLY special characters).
**Defense:** I will add property-based style tests (or at least comprehensive table-driven tests) for the escape functions to ensure they handle all defined special characters correctly according to the specs (MECARD/BIZ/vCard standards).
