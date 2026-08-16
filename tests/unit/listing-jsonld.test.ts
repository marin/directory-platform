import { describe, it, expect } from "vitest";
import { buildListingJsonLd, buildCollectionJsonLd } from "../../src/lib/seo/structured-data/builders.ts";
import { formatPrice } from "../../src/lib/aggregates/compute.ts";
import type { NormalizedEntry } from "../../src/lib/data/normalize-entry.ts";
import type { AggregateStats } from "../../src/lib/aggregates/compute.ts";

function baseEntry(overrides: Partial<NormalizedEntry> = {}): NormalizedEntry {
  return {
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
    isOpen: true,
    nap: {
      name: "Test Praxis",
      phone: undefined,
      formattedPhone: undefined,
      formattedAddress: undefined,
    },
    ...overrides,
  } as NormalizedEntry;
}

function business(jsonLd: Record<string, unknown>): Record<string, unknown> {
  const graph = (jsonLd as { "@graph"?: Record<string, unknown>[] })["@graph"];
  if (!graph) return jsonLd;
  return graph.find((node) => node["@type"] === "MedicalBusiness")!;
}

describe("buildListingJsonLd — openingHoursSpecification", () => {
  it("maps a single daily range to one OpeningHoursSpecification", () => {
    const entry = baseEntry({
      openingHours: [{ day: "Monday", open: "09:00", close: "18:00" }],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "https://schema.org/Monday",
        opens: "09:00",
        closes: "18:00",
      },
    ]);
  });

  it("emits one specification per range for split hours on the same day", () => {
    const entry = baseEntry({
      openingHours: [
        { day: "Monday", open: "09:00", close: "13:00" },
        { day: "Monday", open: "14:00", close: "18:00" },
      ],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "https://schema.org/Monday",
        opens: "09:00",
        closes: "13:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "https://schema.org/Monday",
        opens: "14:00",
        closes: "18:00",
      },
    ]);
  });

  it("skips rows with an unrecognized day or an unparseable time, keeping valid rows", () => {
    const entry = baseEntry({
      openingHours: [
        { day: "Funday", open: "9:00", close: "20:00" },
        { day: "Tuesday", open: "09:00", close: "" },
        { day: "Wednesday", open: "09:00", close: "18:00" },
      ] as unknown as NormalizedEntry["openingHours"],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "https://schema.org/Wednesday",
        opens: "09:00",
        closes: "18:00",
      },
    ]);
  });

  it("omits the property entirely when there is no usable opening-hours data", () => {
    const entry = baseEntry({
      openingHours: [{ day: "Funday", open: "9:00", close: "20:00" }] as unknown as
        NormalizedEntry["openingHours"],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.openingHoursSpecification).toBeUndefined();

    const noHours = business(buildListingJsonLd(baseEntry(), undefined));
    expect(noHours.openingHoursSpecification).toBeUndefined();
  });

  it("does not emit opening hours for a closed entry", () => {
    const entry = baseEntry({
      status: "closed",
      isOpen: false,
      openingHours: [{ day: "Monday", open: "09:00", close: "18:00" }],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.openingHoursSpecification).toBeUndefined();
  });
});

describe("buildListingJsonLd — priceRange", () => {
  it("formats a low–high range from offers with numeric prices", () => {
    const entry = baseEntry({
      offers: [
        { name: "Erstgespräch", price: 25 },
        { name: "Behandlung", price: 90 },
        { name: "Ohne Preis" },
      ],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.priceRange).toBe(`${formatPrice(25)} – ${formatPrice(90)}`);
  });

  it("uses a single formatted price when every offer costs the same", () => {
    const entry = baseEntry({
      offers: [
        { name: "Behandlung A", price: 50 },
        { name: "Behandlung B", price: 50 },
      ],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.priceRange).toBe(formatPrice(50));
  });

  it("omits priceRange when no offer has a usable numeric price", () => {
    const entry = baseEntry({
      offers: [{ name: "Erstgespräch" }, { name: "Behandlung" }],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.priceRange).toBeUndefined();
  });

  it("omits priceRange for a closed entry even with priced offers", () => {
    const entry = baseEntry({
      status: "closed",
      isOpen: false,
      offers: [{ name: "Behandlung", price: 50 }],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.priceRange).toBeUndefined();
  });
});

describe("buildListingJsonLd — availableService", () => {
  it("lists offers as MedicalTherapy items", () => {
    const entry = baseEntry({
      offers: [{ name: "Akupunktur" }, { name: "Ernährungsberatung", price: 40 }],
    });
    const result = business(buildListingJsonLd(entry, undefined));
    expect(result.availableService).toEqual([
      { "@type": "MedicalTherapy", name: "Akupunktur" },
      { "@type": "MedicalTherapy", name: "Ernährungsberatung" },
    ]);
  });

  it("omits availableService when there are no offers", () => {
    const result = business(buildListingJsonLd(baseEntry(), undefined));
    expect(result.availableService).toBeUndefined();
  });
});

describe("buildListingJsonLd — areaServed", () => {
  it("lists every matching area as an AdministrativeArea", () => {
    const entry = baseEntry({ areaIds: ["mitte", "pankow"] });
    const result = business(
      buildListingJsonLd(entry, undefined, [
        { id: "mitte", slug: "mitte", name: "Mitte" },
        { id: "pankow", slug: "pankow", name: "Pankow" },
      ]),
    );
    expect(result.areaServed).toEqual([
      { "@type": "AdministrativeArea", name: "Mitte" },
      { "@type": "AdministrativeArea", name: "Pankow" },
    ]);
  });

  it("omits areaServed when no areas are passed", () => {
    const result = business(buildListingJsonLd(baseEntry(), undefined));
    expect(result.areaServed).toBeUndefined();
  });
});

describe("buildCollectionJsonLd — paginated breadcrumb", () => {
  const emptyStats: AggregateStats = {
    listingCount: 0,
    priceStats: { count: 0, median: undefined, min: undefined, max: undefined },
    openLateCount: 0,
    openSundayCount: 0,
    mostRecentUpdate: undefined,
    updatedLast90Days: 0,
    offersByDuration: new Map(),
  };

  function lastBreadcrumbItem(jsonLd: Record<string, unknown>): string {
    const graph = (jsonLd as { "@graph": Array<Record<string, unknown>> })["@graph"];
    const breadcrumbs = graph.find((node) => node["@type"] === "BreadcrumbList") as {
      itemListElement: Array<{ item: string }>;
    };
    const elements = breadcrumbs.itemListElement;
    return elements[elements.length - 1]!.item;
  }

  it("points the last breadcrumb item at the page-N URL for a paginated call", () => {
    const jsonLd = buildCollectionJsonLd(
      "category",
      { name: "Akupunktur / TCM", slug: "akupunktur-tcm" },
      [],
      emptyStats,
      undefined,
      2,
    );
    expect(lastBreadcrumbItem(jsonLd)).toBe(
      "https://naturav.com/methoden/akupunktur-tcm/2/",
    );
  });

  it("still points the last breadcrumb item at the page-1 URL when no page is given", () => {
    const jsonLd = buildCollectionJsonLd(
      "category",
      { name: "Akupunktur / TCM", slug: "akupunktur-tcm" },
      [],
      emptyStats,
    );
    expect(lastBreadcrumbItem(jsonLd)).toBe(
      "https://naturav.com/methoden/akupunktur-tcm/",
    );
  });
});
