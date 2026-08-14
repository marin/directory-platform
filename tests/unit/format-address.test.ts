import { describe, it, expect } from "vitest";
import { formatAddress } from "../../src/lib/data/normalize.ts";

describe("formatAddress", () => {
  it("formats as street, postal code and city", () => {
    expect(
      formatAddress({
        street: "Torstraße 227",
        locality: "Berlin",
        region: "Berlin",
        postalCode: "10115",
        country: "DE",
      }),
    ).toBe("Torstraße 227, 10115 Berlin");
  });

  it("omits the postal code when missing", () => {
    expect(
      formatAddress({
        street: "Torstraße 227",
        locality: "Berlin",
        region: "Berlin",
        country: "DE",
      }),
    ).toBe("Torstraße 227, Berlin");
  });
});
