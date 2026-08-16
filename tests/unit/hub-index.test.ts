import { describe, it, expect } from "vitest";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import {
  buildMethodsIndexJsonLd,
  buildAreasIndexJsonLd,
  METHODS_PATH,
  AREAS_PATH,
} from "../../src/lib/seo/structured-data/hub-index.ts";

function graphTypes(jsonLd: Record<string, unknown>): unknown[] {
  const graph = jsonLd["@graph"] as Array<Record<string, unknown>>;
  return graph.map((node) => node["@type"]);
}

function itemTypes(jsonLd: Record<string, unknown>): string[] {
  const graph = jsonLd["@graph"] as Array<Record<string, unknown>>;
  const list = graph.find((node) => node["@type"] === "ItemList") as {
    itemListElement: Array<{ item: { "@type": string; url: string } }>;
  };
  return list.itemListElement.map((entry) => entry.item["@type"]);
}

describe("methods index JSON-LD", () => {
  const dataset = loadDataset();

  it("emits CollectionPage, ItemList of MedicalTherapy and breadcrumbs", () => {
    const jsonLd = buildMethodsIndexJsonLd(
      dataset.categories,
      "Methoden und Schwerpunkte",
      "Alle Schwerpunkte im Verzeichnis.",
    );
    const types = graphTypes(jsonLd);
    expect(types).toContain("CollectionPage");
    expect(types).toContain("ItemList");
    expect(types).toContain("BreadcrumbList");
    expect(types).not.toContain("FAQPage");

    expect(new Set(itemTypes(jsonLd))).toEqual(new Set(["MedicalTherapy"]));
    expect(JSON.stringify(jsonLd)).toContain(METHODS_PATH);
    expect(JSON.stringify(jsonLd)).toContain("/category/");
  });
});

describe("areas index JSON-LD", () => {
  const dataset = loadDataset();

  it("emits CollectionPage, ItemList of AdministrativeArea and breadcrumbs", () => {
    const jsonLd = buildAreasIndexJsonLd(
      dataset.areas,
      "Praxen nach Bezirk",
      "Heilpraktiker-Praxen in Berlin nach Bezirk.",
    );
    const types = graphTypes(jsonLd);
    expect(types).toContain("CollectionPage");
    expect(types).toContain("ItemList");
    expect(types).toContain("BreadcrumbList");
    expect(types).not.toContain("FAQPage");

    expect(new Set(itemTypes(jsonLd))).toEqual(new Set(["AdministrativeArea"]));
    expect(JSON.stringify(jsonLd)).toContain(AREAS_PATH);
    expect(JSON.stringify(jsonLd)).toContain("/area/");
  });
});
