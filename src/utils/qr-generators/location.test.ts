import { describe, it, expect } from "vitest";
import { constructLocationString, hydrateLocationData } from "./location";

describe("Location generator", () => {
  it("constructs and hydrates successfully", () => {
    const data = {
      latitude: "37.7749",
      longitude: "-122.4194",
    };
    const str = constructLocationString(data);
    const hydrated = hydrateLocationData(str);
    expect(hydrated).toEqual(data);
  });

  it("handles missing or malformed data", () => {
    expect(hydrateLocationData("random").latitude).toBe("");
    expect(hydrateLocationData("geo:123").latitude).toBe("");
  });
});
