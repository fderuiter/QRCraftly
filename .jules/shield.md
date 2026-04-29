## 2025-04-28 - Missing Test Coverage for Input Components
**Discovery:** The `MeetingInput` and `SocialInput` form components lacked test coverage for basic behavior, UI rendering, and mock interactions.
**Defense:** Ensure all interactive form components (`*Input.tsx`) include unit tests adjacent to the source code (e.g. `*Input.test.tsx`) that verify UI presence, correct state mappings, and correct `onChange` handlers via mock functions using the AAA (Arrange, Act, Assert) testing pattern.
