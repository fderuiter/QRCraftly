import { describe, it, expect } from "vitest";
import {
  constructVCardString,
  hydrateVCardData,
  escapeVCardString,
  unescapeVCardString,
} from "./vcard";

describe("VCard generator", () => {
  it("constructs and hydrates successfully", () => {
    const data = {
      firstName: "John",
      lastName: "Doe",
      organization: "Acme Corp",
      title: "CEO",
      phone: "123456789",
      email: "john@example.com",
      website: "https://example.com",
      street: "123 Main St",
      city: "Anytown",
      zip: "12345",
      country: "USA",
    };
    const str = constructVCardString(data);
    const hydrated = hydrateVCardData(str);
    // website gets a trailing slash due to normalization
    expect(hydrated).toEqual({ ...data, website: "https://example.com/" });
  });

  it("handles empty values or non-vcard strings", () => {
    expect(hydrateVCardData("random")).toEqual({
      firstName: "",
      lastName: "",
      organization: "",
      title: "",
      phone: "",
      email: "",
      website: "",
      street: "",
      city: "",
      zip: "",
      country: "",
    });
  });

  it("handles invalid lines", () => {
    const raw = `BEGIN:VCARD\nINVALID\nEND:VCARD`;
    expect(hydrateVCardData(raw).firstName).toBe("");
  });

  it("handles edge cases in unescaping", () => {
    expect(escapeVCardString(undefined)).toBe("");
    expect(unescapeVCardString(undefined)).toBe("");
  });
});

it("handles empty parts in N and ADR", () => {
  const raw = `BEGIN:VCARD\nN:;\nADR:;;\nEND:VCARD`;
  const hydrated = hydrateVCardData(raw);
  expect(hydrated.lastName).toBe("");
  expect(hydrated.firstName).toBe("");
  expect(hydrated.street).toBe("");
  expect(hydrated.city).toBe("");
  expect(hydrated.zip).toBe("");
  expect(hydrated.country).toBe("");
});
