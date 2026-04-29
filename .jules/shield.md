## 2025-04-28 - Missing Test Coverage for Input Components
**Discovery:** The `MeetingInput` and `SocialInput` form components lacked test coverage for basic behavior, UI rendering, and mock interactions.
**Defense:** Ensure all interactive form components (`*Input.tsx`) include unit tests adjacent to the source code (e.g. `*Input.test.tsx`) that verify UI presence, correct state mappings, and correct `onChange` handlers via mock functions using the AAA (Arrange, Act, Assert) testing pattern.

## 2025-05-18 - Missing Sad Path for Meeting URLs
**Discovery:** The `MeetingInput` component was missing a "Sad Path" test case to verify its behavior when provided with an unrecognized or completely generic URL (e.g. `https://example.com/unknown-meeting`). Without this, there was a risk that unknown inputs could falsely trigger the display of specific meeting details or IDs, leading to UI bugs or confusion.
**Defense:** Explicitly test boundary conditions and unrecognized formats (sad paths) for components that perform pattern matching or parsing, ensuring the UI degrades gracefully or ignores invalid data instead of attempting to render it.
