# CLI Testing Patterns

When applying TDD to CLI commands, the standard Red-Green-Refactor loop applies but the testing strategies require CLI-specific adaptations.

## The Testing Pyramid for CLIs

| Level | Scope | Method | Goal |
|---|---|---|---|
| **Unit** (most tests) | Individual functions, services, commands | Mock dependencies (fs, network) | Verify logic and error handling |
| **Integration** (fewer) | The compiled binary or entry point | Spawn child processes, capture stdout/stderr | Verify the "glue" code and startup |
| **Interactive** (fewest) | Prompt-based UIs (inquirer, ink) | Start & Kill pattern or input injection | Ensure prompts start and don't crash |

## Behavior-Centric Test Naming

Avoid naming tests after implementation details. This couples tests to the framework.

```typescript
// Bad: coupled to Citty framework
describe("citty-commands", () => { ... });

// Good: describes behavior, survives framework swaps
describe("command-structure", () => {
  it("list command exports a valid definition", ...);
  it("help flag produces structured output", ...);
});
```

If you rename an internal function and your tests break, the tests are named wrong.

## Framework Migration Pattern

When migrating from one CLI framework to another (e.g., Commander → Citty):

### Step 1: Lock current behavior

Write tests that assert the current output of every command. These tests should pass immediately against the existing implementation.

```typescript
import { describe, it, expect } from "vitest";

describe("list command (pre-migration)", () => {
  it("exports a valid command definition", async () => {
    const mod = await import("../src/commands/list.js");
    expect(mod.default).toBeDefined();
    expect(mod.default.meta.name).toBe("list");
  });

  it("has required subcommands", async () => {
    const mod = await import("../src/commands/list.js");
    expect(mod.default.subCommands).toBeDefined();
  });
});
```

### Step 2: Swap the implementation

Replace the framework code. The tests will go Red.

### Step 3: Fix until Green

Update the new implementation until all locked tests pass. Do not modify the tests — they represent the required behavior.

## Resolving Framework Union Types

Some frameworks (like Citty) use union types for exports (e.g., `Resolvable<T>` = `T | Promise<T> | () => T`). Tests must handle all branches:

```typescript
// Exhaustive resolution — handles function, promise, and direct value
const meta = await (typeof cmd.meta === "function" ? cmd.meta() : cmd.meta);
expect(meta.name).toBe("list");
```

## CLI-Specific Gotchas

- **Subprocess timeouts:** Real CLI commands are slow. Use aggressive timeouts and mock heavy operations in unit tests. Reserve real subprocess tests for integration.
- **`process.env` leakage:** Tests that read environment variables can interfere with each other. Use `vi.stubEnv()` and restore in `afterEach`.
- **Stdout assertions are fragile:** Don't assert exact stdout strings (they break when formatting changes). Assert structured JSON output or use `toContain()` for key fragments.
- **Exit code semantics:** Test both stdout/stderr *and* exit codes. A command can print correct output but exit with code 1, or vice versa.
