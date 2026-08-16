import { describe, it, expect } from "vitest";
import { createLastmodResolver } from "../../src/lib/seo/sitemap-lastmod.ts";
import { normalizeEntry } from "../../src/lib/data/normalize-entry.ts";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import type { Dataset } from "../../src/lib/data/load-dataset.ts";

const ORIGIN = "https://naturav.com";

function entry(overrides: Record<string, unknown>) {
  return normalizeEntry(
    entrySchema.parse({
      id: overrides.slug,
      name: "Test Praxis",
      description: "Eine Testpraxis fuer Unit-Tests mit ausreichend Text.",
      categories: ["akupunktur-tcm"],
      faq: [],
      offers: [],
      images: [],
      ...overrides,
    }),
  );
}

const entryA = entry({
  slug: "entry-a",
  categories: ["akupunktur-tcm"],
  areaIds: ["mitte"],
  lastUpdated: "2026-01-01",
});
const entryB = entry({
  slug: "entry-b",
  categories: ["akupunktur-tcm"],
  indicationIds: ["burnout"],
  lastUpdated: "2026-06-15",
});
const entryC = entry({
  slug: "entry-c",
  categories: ["other-cat"],
  lastUpdated: "2026-07-01",
});

function buildDataset(): Dataset {
  return {
    siteConfig: undefined as never,
    categories: [
      { id: "akupunktur-tcm", slug: "akupunktur-tcm", name: "Akupunktur" },
      { id: "other-cat", slug: "other-cat", name: "Sonstiges" },
      { id: "leer-cat", slug: "leer-cat", name: "Leer" },
    ],
    areas: [{ id: "mitte", slug: "mitte", name: "Mitte" }],
    indications: [{ id: "burnout", slug: "burnout", name: "Burnout", synonyms: ["x"] }],
    associations: [
      {
        id: "vdh",
        slug: "vdh",
        name: "VDH",
        description: "Verband",
        synonyms: ["x"],
        kind: "verband",
      },
    ],
    entries: [entryA, entryB, entryC],
    redirects: [],
    campaigns: [],
    categoryIntros: new Map(),
    areaIntros: new Map(),
    indicationIntros: new Map(),
    associationIntros: new Map(),
    categoryFaqs: new Map(),
    areaFaqs: new Map(),
    indicationFaqs: new Map(),
    associationFaqs: new Map(),
    reviews: new Map(),
  };
}

describe("createLastmodResolver", () => {
  const resolver = createLastmodResolver(buildDataset());

  it("resolves an entry page to that entry's own lastUpdated", () => {
    expect(resolver.resolve(`${ORIGIN}/heilpraktiker/entry-a/`)).toBe("2026-01-01");
    expect(resolver.resolve(`${ORIGIN}/heilpraktiker/entry-b/`)).toBe("2026-06-15");
  });

  it("resolves a category page to the most recent update among its own entries", () => {
    // entry-a (2026-01-01) and entry-b (2026-06-15) are both in akupunktur-tcm;
    // entry-c (2026-07-01, the dataset-wide max) is in a different category and
    // must NOT leak into this collection's date.
    expect(resolver.resolve(`${ORIGIN}/methoden/akupunktur-tcm/`)).toBe("2026-06-15");
  });

  it("resolves a paginated category page to the same collection-wide date as page 1", () => {
    expect(resolver.resolve(`${ORIGIN}/methoden/akupunktur-tcm/2/`)).toBe("2026-06-15");
    expect(resolver.resolve(`${ORIGIN}/methoden/akupunktur-tcm/7/`)).toBe("2026-06-15");
  });

  it("resolves bezirk, indikation and verband detail pages independently", () => {
    expect(resolver.resolve(`${ORIGIN}/bezirk/mitte/`)).toBe("2026-01-01");
    expect(resolver.resolve(`${ORIGIN}/indikation/burnout/`)).toBe("2026-06-15");
  });

  it("returns undefined for a collection page with no matching entries", () => {
    expect(resolver.resolve(`${ORIGIN}/methoden/leer-cat/`)).toBeUndefined();
    expect(resolver.resolve(`${ORIGIN}/verband/vdh/`)).toBeUndefined();
  });

  it("resolves the homepage and dataset-driven hub index pages to the dataset-wide most recent update", () => {
    expect(resolver.resolve(`${ORIGIN}/`)).toBe("2026-07-01");
    expect(resolver.resolve(`${ORIGIN}/bezirk/`)).toBe("2026-07-01");
    expect(resolver.resolve(`${ORIGIN}/indikation/`)).toBe("2026-07-01");
    expect(resolver.resolve(`${ORIGIN}/verband/`)).toBe("2026-07-01");
    expect(resolver.resolve(`${ORIGIN}/methoden/`)).toBe("2026-07-01");
  });

  it("returns undefined for static/legal pages and anything else unrecognized", () => {
    expect(resolver.resolve(`${ORIGIN}/impressum/`)).toBeUndefined();
    expect(resolver.resolve(`${ORIGIN}/datenschutz/`)).toBeUndefined();
    expect(resolver.resolve(`${ORIGIN}/nutzungsbedingungen/`)).toBeUndefined();
    expect(resolver.resolve(`${ORIGIN}/kontakt/`)).toBeUndefined();
    expect(resolver.resolve(`${ORIGIN}/ueber-uns/`)).toBeUndefined();
    expect(resolver.resolve(`${ORIGIN}/eintrag-melden/`)).toBeUndefined();
    expect(resolver.resolve(`${ORIGIN}/unknown-route/`)).toBeUndefined();
  });

  it("is agnostic to trailing-slash style", () => {
    expect(resolver.resolve(`${ORIGIN}/heilpraktiker/entry-a`)).toBe("2026-01-01");
    expect(resolver.resolve(`${ORIGIN}/heilpraktiker/entry-a/`)).toBe("2026-01-01");
  });
});
