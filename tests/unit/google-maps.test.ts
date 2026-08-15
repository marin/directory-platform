import { describe, it, expect } from "vitest";
import {
  buildGoogleMapsPlaceUrl,
  extractPlaceIdFromGoogleMapsUrl,
  resolveGoogleMapsUrl,
} from "../../src/lib/geo/google-maps.ts";
import {
  formatGoogleMapsRating,
  formatGoogleMapsRatingsCount,
  hasGoogleMapsRating,
  parseGoogleMapsRatingFields,
  shouldEmitAggregateRating,
} from "../../src/lib/geo/google-maps-rating.ts";
import { buildListingJsonLd } from "../../src/lib/seo/structured-data/builders.ts";

describe("buildGoogleMapsPlaceUrl", () => {
  it("builds a German Google Maps place listing URL from a Place ID", () => {
    expect(buildGoogleMapsPlaceUrl("ChIJQYAMi05FqEcRwhm-z74hols")).toBe(
      "https://www.google.de/maps/place/?q=place_id:ChIJQYAMi05FqEcRwhm-z74hols",
    );
  });
});

describe("extractPlaceIdFromGoogleMapsUrl", () => {
  it("extracts a place ID from a listing URL", () => {
    expect(
      extractPlaceIdFromGoogleMapsUrl(
        "https://www.google.de/maps/place/?q=place_id:ChIJQYAMi05FqEcRwhm-z74hols",
      ),
    ).toBe("ChIJQYAMi05FqEcRwhm-z74hols");
  });
});

describe("resolveGoogleMapsUrl", () => {
  it("prefers Place ID over scraped URL", () => {
    expect(
      resolveGoogleMapsUrl(
        "ChIJQYAMi05FqEcRwhm-z74hols",
        "https://www.google.com/maps?cid=6602877107091413442",
      ),
    ).toBe("https://www.google.de/maps/place/?q=place_id:ChIJQYAMi05FqEcRwhm-z74hols");
  });

  it("rewrites scraped google.com maps URLs to google.de", () => {
    expect(
      resolveGoogleMapsUrl(
        undefined,
        "https://www.google.com/maps?cid=6602877107091413442",
      ),
    ).toBe("https://www.google.de/maps?cid=6602877107091413442");
  });
});

describe("parseGoogleMapsRatingFields", () => {
  it("parses score and ratings count from CSV fields", () => {
    expect(parseGoogleMapsRatingFields("4.7", "23")).toEqual({
      googleMapsRating: 4.7,
      googleMapsRatingsCount: 23,
    });
  });

  it("rejects invalid or empty ratings", () => {
    expect(parseGoogleMapsRatingFields("5", "0")).toBeUndefined();
    expect(parseGoogleMapsRatingFields("", "12")).toBeUndefined();
  });
});

describe("hasGoogleMapsRating", () => {
  it("requires a positive rating count", () => {
    expect(hasGoogleMapsRating({ googleMapsRating: 4.5, googleMapsRatingsCount: 3 })).toBe(true);
    expect(hasGoogleMapsRating({ googleMapsRating: 4.5, googleMapsRatingsCount: 0 })).toBe(false);
  });
});

describe("formatGoogleMapsRating", () => {
  it("formats ratings for German locale", () => {
    expect(formatGoogleMapsRating(4.7, "de-DE")).toBe("4,7");
    expect(formatGoogleMapsRatingsCount(1234, "de-DE")).toBe("1.234");
  });
});

describe("shouldEmitAggregateRating", () => {
  it("requires the configured minimum review count", () => {
    expect(shouldEmitAggregateRating(3)).toBe(true);
    expect(shouldEmitAggregateRating(2)).toBe(false);
  });
});

describe("buildListingJsonLd", () => {
  it("includes aggregateRating when enough Google reviews exist", () => {
    const jsonLd = buildListingJsonLd(
      {
        id: "test",
        slug: "test",
        name: "Test Praxis",
        description: "Test description.",
        lastUpdated: "2026-08-14",
        status: "open",
        categories: ["naturheilkunde"],
        areaIds: [],
        openingHours: [],
        offers: [],
        images: [],
        faq: [],
        googleMapsRating: 4.8,
        googleMapsRatingsCount: 12,
        isOpen: true,
        nap: {
          name: "Test Praxis",
          phone: undefined,
          formattedPhone: undefined,
          formattedAddress: undefined,
        },
      },
      { id: "naturheilkunde", slug: "naturheilkunde", name: "Naturheilkunde" },
    );

    const graph = (jsonLd as { "@graph": Record<string, unknown>[] })["@graph"];
    const business = graph.find((node) => node["@type"] === "MedicalBusiness");
    expect(business?.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.8,
      reviewCount: 12,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it("includes hasMap when a Google Maps URL exists", () => {
    const jsonLd = buildListingJsonLd(
      {
        id: "test",
        slug: "test",
        name: "Test Praxis",
        description: "Test description.",
        lastUpdated: "2026-08-14",
        status: "open",
        categories: ["naturheilkunde"],
        areaIds: [],
        openingHours: [],
        offers: [],
        images: [],
        faq: [],
        googleMapsUrl:
          "https://www.google.de/maps/place/?q=place_id:ChIJQYAMi05FqEcRwhm-z74hols",
        geo: { lat: 52.52, lng: 13.405 },
        isOpen: true,
        nap: {
          name: "Test Praxis",
          phone: undefined,
          formattedPhone: undefined,
          formattedAddress: "Torstr. 1, 10119 Berlin",
        },
      },
      { id: "naturheilkunde", slug: "naturheilkunde", name: "Naturheilkunde" },
    );

    const graph = (jsonLd as { "@graph": Record<string, unknown>[] })["@graph"];
    const business = graph.find((node) => node["@type"] === "MedicalBusiness");
    expect(business?.hasMap).toBe(
      "https://www.google.de/maps/place/?q=place_id:ChIJQYAMi05FqEcRwhm-z74hols",
    );
  });

  it("includes image when entry images exist", () => {
    const jsonLd = buildListingJsonLd(
      {
        id: "test",
        slug: "test",
        name: "Test Praxis",
        description: "Test description.",
        lastUpdated: "2026-08-14",
        status: "open",
        categories: ["naturheilkunde"],
        areaIds: [],
        openingHours: [],
        offers: [],
        images: ["/images/entries/test/0.webp"],
        faq: [],
        isOpen: true,
        nap: {
          name: "Test Praxis",
          phone: undefined,
          formattedPhone: undefined,
          formattedAddress: undefined,
        },
      },
      { id: "naturheilkunde", slug: "naturheilkunde", name: "Naturheilkunde" },
    );

    const graph = (jsonLd as { "@graph": Record<string, unknown>[] })["@graph"];
    const business = graph.find((node) => node["@type"] === "MedicalBusiness");
    expect(business?.image).toBe("https://naturav.com/images/entries/test/0.webp");
  });

  it("includes knowsAbout for tagged indications", () => {
    const jsonLd = buildListingJsonLd(
      {
        id: "test",
        slug: "test",
        name: "Test Praxis",
        description: "Test description.",
        lastUpdated: "2026-08-15",
        status: "open",
        categories: ["naturheilkunde"],
        areaIds: [],
        indicationIds: ["kinderwunsch", "allergien"],
        openingHours: [],
        offers: [],
        images: [],
        faq: [],
        isOpen: true,
        nap: {
          name: "Test Praxis",
          phone: undefined,
          formattedPhone: undefined,
          formattedAddress: undefined,
        },
      },
      { id: "naturheilkunde", slug: "naturheilkunde", name: "Naturheilkunde" },
      undefined,
      [
        { id: "allergien", name: "Allergien", slug: "allergien", synonyms: ["allergien"] },
        { id: "kinderwunsch", name: "Kinderwunsch", slug: "kinderwunsch", synonyms: ["kinderwunsch"] },
      ],
    );

    const graph = (jsonLd as { "@graph": Record<string, unknown>[] })["@graph"];
    const business = graph.find((node) => node["@type"] === "MedicalBusiness");
    expect(business?.knowsAbout).toEqual([
      { "@type": "MedicalCondition", name: "Allergien" },
      { "@type": "MedicalCondition", name: "Kinderwunsch" },
    ]);
  });
});
