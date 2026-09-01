import { describe, expect, it } from "vitest";

import { greet } from "../index";

describe("example package", () => {
  it("exposes behavior through its entry point", () => {
    expect(greet("QRCraftly")).toBe("Hello, QRCraftly!");
  });
});
