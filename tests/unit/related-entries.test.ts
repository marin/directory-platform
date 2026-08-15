import { describe, it, expect } from "vitest";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import { normalizeEntry } from "../../src/lib/data/normalize-entry.ts";
import {
  getRelatedEntries,
  relatedCategoryId,
  relatedEntriesTitle,
  toEntryViewModel,
} from "../../src/lib/data/view-models/entry.ts";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";

const categories = [
  { id: "naturheilkunde", name: "Naturheilkunde", slug: "naturheilkunde" },
  { id: "osteopathie", name: "Osteopathie", slug: "osteopathie" },
  { id: "psychotherapie", name: "Psychotherapie", slug: "psychotherapie" },
];
const areas = [
  { id: "mitte", name: "Mitte", slug: "mitte" },
  { id: "pankow", name: "Pankow", slug: "pankow" },
];

function entry(partial: {
  slug: string;
  name?: string;
  categories: string[];
  areaIds: string[];
  indicationIds?: string[];
  description?: string;
  lastUpdated?: string;
}) {
  return normalizeEntry(
    entrySchema.parse({
      id: partial.slug,
      slug: partial.slug,
      name: partial.name ?? partial.slug,
      description: partial.description ?? "Praxis in Berlin mit naturheilkundlichem Angebot.",
      lastUpdated: partial.lastUpdated ?? "2026-08-01",
      categories: partial.categories,
      areaIds: partial.areaIds,
      indicationIds: partial.indicationIds,
    }),
  );
}

  it("skips the catch-all category when a more specific one exists", () => {
    const counts = new Map([
      ["naturheilkunde", 400],
      ["osteopathie", 80],
    ]);
    expect(
      relatedCategoryId({ categories: ["naturheilkunde", "osteopathie"] }, counts),
    ).toBe("osteopathie");
  });

describe("relatedEntriesTitle", () => {
  it("names category and district when both are known", () => {
    expect(relatedEntriesTitle("Osteopathie", "Mitte")).toBe(
      "Weitere Heilpraktiker für Osteopathie in Mitte",
    );
  });
});

describe("getRelatedEntries", () => {
  const osteoMitte = entry({
    slug: "osteo-mitte",
    name: "Osteopathie Mitte",
    categories: ["osteopathie", "naturheilkunde"],
    areaIds: ["mitte"],
    lastUpdated: "2026-08-10",
  });
  const osteoMitte2 = entry({
    slug: "osteo-mitte-2",
    name: "Zweite Osteopathie Mitte",
    categories: ["osteopathie"],
    areaIds: ["mitte"],
    lastUpdated: "2026-08-12",
    description:
      "Eine ausführliche Beschreibung der osteopathischen Praxis in Mitte mit Schwerpunkten und Methoden, die über zweihundert Zeichen lang ist damit der Richness-Score steigt und diese Praxis in Related oben steht wenn nach Qualität sortiert wird.",
  });
  const osteoPankow = entry({
    slug: "osteo-pankow",
    name: "Osteopathie Pankow",
    categories: ["osteopathie"],
    areaIds: ["pankow"],
  });
  const naturMitte = entry({
    slug: "natur-mitte",
    name: "Naturheilkunde Mitte",
    categories: ["naturheilkunde"],
    areaIds: ["mitte"],
  });
  const naturPankow = entry({
    slug: "natur-pankow",
    name: "Naturheilkunde Pankow",
    categories: ["naturheilkunde"],
    areaIds: ["pankow"],
  });
  const naturSpandau = entry({
    slug: "natur-spandau",
    name: "Naturheilkunde mehr",
    categories: ["naturheilkunde"],
    areaIds: ["pankow"],
  });
  const all = [
    osteoMitte,
    osteoMitte2,
    osteoPankow,
    naturMitte,
    naturPankow,
    naturSpandau,
  ];

  it("prefers the same specific category in the same district", () => {
    const related = getRelatedEntries(osteoMitte, all, categories, areas, 4);
    expect(related.title).toBe("Weitere Heilpraktiker für Osteopathie in Mitte");
    expect(related.entries.map((item) => item.slug)).toEqual(["osteo-mitte-2"]);
  });

  it("sorts same-district peers by richness", () => {
    const related = getRelatedEntries(osteoMitte, all, categories, areas, 4);
    expect(related.entries[0]?.slug).toBe("osteo-mitte-2");
  });

  it("does not mix in other districts when local peers exist", () => {
    const related = getRelatedEntries(osteoMitte, all, categories, areas, 4);
    expect(related.entries.map((item) => item.slug)).not.toContain("osteo-pankow");
  });

  it("falls back to the same category citywide when the district is empty", () => {
    const isolated = entry({
      slug: "osteo-alone",
      categories: ["osteopathie"],
      areaIds: ["pankow"],
    });
    const related = getRelatedEntries(
      isolated,
      [isolated, osteoMitte, osteoMitte2],
      categories,
      areas,
      4,
    );
    expect(related.title).toBe("Weitere Heilpraktiker für Osteopathie");
    expect(related.entries.map((item) => item.slug)).toEqual(
      expect.arrayContaining(["osteo-mitte", "osteo-mitte-2"]),
    );
  });

  it("prefers the same indication in the same district over category peers", () => {
    const indications = [
      { id: "kinderwunsch", name: "Kinderwunsch", slug: "kinderwunsch", synonyms: ["kinderwunsch"] },
    ];
    const source = entry({
      slug: "kinder-mitte",
      categories: ["naturheilkunde"],
      areaIds: ["mitte"],
      indicationIds: ["kinderwunsch"],
    });
    const sameIndication = entry({
      slug: "kinder-mitte-2",
      categories: ["akupunktur-tcm"],
      areaIds: ["mitte"],
      indicationIds: ["kinderwunsch"],
    });
    const sameCategory = entry({
      slug: "natur-mitte-peer",
      categories: ["naturheilkunde"],
      areaIds: ["mitte"],
    });
    const related = getRelatedEntries(
      source,
      [source, sameIndication, sameCategory],
      categories,
      areas,
      4,
      indications,
    );
    expect(related.title).toBe("Weitere Heilpraktiker für Kinderwunsch in Mitte");
    expect(related.entries.map((item) => item.slug)).toEqual(["kinder-mitte-2"]);
  });
});

describe("toEntryViewModel badges", () => {
  it("exposes HPP badges with a link to the psychotherapy category", () => {
    const dataset = loadDataset();
    const entry = dataset.entries.find((item) =>
      /heilpraktiker(?:in)? für psychotherapie/i.test(item.name),
    );
    expect(entry).toBeDefined();
    const vm = toEntryViewModel(
      entry!,
      dataset.categories,
      dataset.areas,
      dataset.entries,
      dataset.indications,
    );
    const hpp = vm.badges.find((badge) => badge.id === "hpp");
    expect(hpp?.label).toBe("Heilpraktiker für Psychotherapie");
    expect(hpp?.href).toBe("/category/psychotherapie");
  });
});
