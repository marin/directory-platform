import { describe, it, expect } from "vitest";
import { mergeServiceOffers, offersFromExtracted } from "../../src/lib/data/offers-from-extracted.ts";

describe("offersFromExtracted", () => {
  it("maps extracted offers to entry offer schema", () => {
    const offers = offersFromExtracted([
      {
        name: "Akupunktur",
        price: 80,
        priceLabel: "80 €",
        durationLabel: "60 min",
      },
      {
        name: "Erstgespräch",
        priceLabel: "ab 50 €",
      },
    ]);

    expect(offers).toEqual([
      {
        id: "offer-1",
        name: "Akupunktur",
        price: 80,
        priceLabel: "80 €",
        durationLabel: "60 min",
        durationMinutes: 60,
      },
      {
        id: "offer-2",
        name: "Erstgespräch",
        priceLabel: "ab 50 €",
      },
    ]);
  });
});

describe("mergeServiceOffers", () => {
  it("adds services without duplicating existing priced offers", () => {
    const merged = mergeServiceOffers(
      [{ id: "offer-1", name: "Akupunktur", price: 80, priceLabel: "80 €" }],
      [
        { name: "Akupunktur", description: "should be skipped" },
        { name: "Schröpfen", description: "klassische Methode" },
      ],
    );

    expect(merged).toEqual([
      { id: "offer-1", name: "Akupunktur", price: 80, priceLabel: "80 €" },
      { id: "offer-2", name: "Schröpfen", description: "klassische Methode" },
    ]);
  });

  it("drops junk existing offers while merging", () => {
    const merged = mergeServiceOffers(
      [
        { id: "offer-1", name: "Kontakt" },
        { id: "offer-2", name: "Akupunktur", price: 80, priceLabel: "80 €" },
      ],
      [{ name: "Book Appointment" }, { name: "Schröpfen" }],
    );

    expect(merged).toEqual([
      { id: "offer-1", name: "Akupunktur", price: 80, priceLabel: "80 €" },
      { id: "offer-2", name: "Schröpfen" },
    ]);
  });

  it("strips trailing ellipsis from kept offer names", () => {
    const merged = mergeServiceOffers(
      [{ id: "offer-1", name: "Akupunktur…" }],
      [{ name: "Hydrocolontherapie…" }],
    );
    expect(merged.map((offer) => offer.name)).toEqual(["Akupunktur", "Hydrocolontherapie"]);
  });
});
