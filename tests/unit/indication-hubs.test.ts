import { describe, it, expect } from "vitest";
import siteConfig from "../../config/site.config.ts";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import { findSimilarPairs } from "../../src/lib/data/uniqueness.ts";
import {
  buildIndicationHubCopy,
  buildIndicationsIndexCopy,
  indicationHubTitle,
  indicationsIndexTitle,
} from "../../src/lib/data/indication-hubs.ts";
import { computeIndicationStats } from "../../src/lib/aggregates/compute.ts";
import { indicationPath, indicationUrl, indicationsPath, indicationsUrl } from "../../src/lib/routing/paths.ts";
import { shouldIndexIndication } from "../../src/lib/data/view-models/entry.ts";
import { buildIndicationsIndexJsonLd, buildCollectionJsonLd } from "../../src/lib/seo/structured-data/builders.ts";

describe("indication paths", () => {
  it("builds hub and paginated paths", () => {
    expect(indicationPath("kinderwunsch")).toBe("/indikation/kinderwunsch/");
    expect(indicationPath("kinderwunsch", 2)).toBe("/indikation/kinderwunsch/2/");
    expect(indicationUrl("kinderwunsch")).toBe(
      `${siteConfig.site.origin}/indikation/kinderwunsch/`,
    );
  });

  it("builds the indication index path", () => {
    expect(indicationsPath()).toBe("/indikation/");
    expect(indicationsUrl()).toBe(`${siteConfig.site.origin}/indikation/`);
  });
});

describe("shouldIndexIndication", () => {
  it("indexes at the configured minimum and noindexes thin hubs", () => {
    const min = siteConfig.quality.minListingsForIndicationPage;
    expect(shouldIndexIndication(0)).toEqual({ index: false, noindex: false });
    expect(shouldIndexIndication(min - 1)).toEqual({ index: false, noindex: true });
    expect(shouldIndexIndication(min)).toEqual({ index: true, noindex: false });
  });
});

describe("indication hub copy", () => {
  const dataset = loadDataset();

  it("uses the directory title formula", () => {
    expect(indicationHubTitle("Kinderwunsch")).toBe(
      "Heilpraktiker für Kinderwunsch in Berlin",
    );
  });

  it("keeps intros unique across indexable hubs", () => {
    const intros = dataset.indications
      .filter(
        (indication) =>
          computeIndicationStats(dataset.entries, indication.id).listingCount > 0,
      )
      .map((indication) => ({
        id: indication.id,
        text: buildIndicationHubCopy(
          indication,
          dataset.entries,
          dataset.areas,
          dataset.categories,
        ).intro,
      }));

    expect(intros.length).toBeGreaterThan(1);
    expect(findSimilarPairs(intros, siteConfig.quality.uniquenessThreshold)).toEqual([]);
  });

  it("does not strip a name that is only a prefix of the description", () => {
    const intro = buildIndicationHubCopy(
      {
        id: "schilddruese",
        name: "Schilddrüse",
        slug: "schilddruese",
        description: "Schilddrüsenbeschwerden einschließlich Hashimoto.",
        synonyms: ["hashimoto"],
      },
      [],
      [],
      [],
    ).intro;
    expect(intro).toContain("Schilddrüsenbeschwerden");
    expect(intro).not.toMatch(/darunter nbeschwerden/i);
  });

  it("skips redundant taxonomy copy and stiff directory phrasing", () => {
    const kinderwunsch = dataset.indications.find((item) => item.id === "kinderwunsch");
    expect(kinderwunsch).toBeDefined();
    const intro = buildIndicationHubCopy(
      kinderwunsch!,
      dataset.entries,
      dataset.areas,
      dataset.categories,
    ).intro;
    expect(intro).not.toMatch(/darunter/i);
    expect(intro).not.toMatch(/naturheilkundliche begleitung/i);
    expect(intro).not.toMatch(/oft steht das neben/i);
    expect(intro).not.toMatch(/listet dieses verzeichnis/i);
    expect(intro).not.toMatch(/einträge gibt es vor allem/i);
  });

  it("grounds intros in listing counts and taxonomy, not medical advice", () => {
    const indication = dataset.indications.find((item) => item.id === "kinderwunsch");
    expect(indication).toBeDefined();
    const stats = computeIndicationStats(dataset.entries, indication!.id);
    const copy = buildIndicationHubCopy(
      indication!,
      dataset.entries,
      dataset.areas,
      dataset.categories,
    );
    expect(copy.intro).toContain(String(stats.listingCount));
    expect(copy.intro).toContain("Berlin");
    expect(copy.intro).toContain("Kinderwunsch");
    expect(copy.faq[0]?.answer).toContain(String(stats.listingCount));
    expect(copy.intro.toLowerCase()).not.toMatch(/heilung|diagnose|verschreib/);
  });
});

describe("indications index copy", () => {
  const dataset = loadDataset();
  const copy = buildIndicationsIndexCopy(dataset.entries, dataset.indications);

  it("uses the directory title formula", () => {
    expect(indicationsIndexTitle()).toBe("Heilpraktiker nach Beschwerde in Berlin");
    expect(copy.title).toBe("Heilpraktiker nach Beschwerde in Berlin");
  });

  it("grounds intro in counts and locality, not medical advice", () => {
    expect(copy.hubs.length).toBeGreaterThan(0);
    expect(copy.intro).toContain(String(copy.hubs.length));
    expect(copy.intro).toContain(String(copy.taggedListingCount));
    expect(copy.intro).toContain("Berlin");
    expect(copy.intro).toContain(copy.hubs[0]!.name);
    expect(copy.intro.toLowerCase()).not.toMatch(/heilung|diagnose|verschreib/);
    expect(copy.description.length).toBeLessThanOrEqual(160);
  });

  it("lists only indexable hubs and answers with directory facts", () => {
    expect(
      copy.hubs.every((hub) => shouldIndexIndication(hub.count).index),
    ).toBe(true);
    expect(copy.faq.length).toBeGreaterThanOrEqual(2);
    expect(copy.faq[0]?.answer).toContain(copy.hubs[0]!.name);
    expect(copy.faq[1]?.answer).toContain(String(copy.taggedListingCount));
  });
});

describe("indications index JSON-LD", () => {
  const dataset = loadDataset();
  const copy = buildIndicationsIndexCopy(dataset.entries, dataset.indications);

  it("emits CollectionPage, ItemList of MedicalCondition, FAQ and breadcrumbs", () => {
    const jsonLd = buildIndicationsIndexJsonLd(
      copy.hubs,
      copy.title,
      copy.description,
      copy.faq,
    );
    const graph = (jsonLd as { "@graph": Array<Record<string, unknown>> })["@graph"];
    const types = graph.map((node) => node["@type"]);
    expect(types).toContain("CollectionPage");
    expect(types).toContain("ItemList");
    expect(types).toContain("FAQPage");
    expect(types).toContain("BreadcrumbList");

    const list = graph.find((node) => node["@type"] === "ItemList") as {
      itemListElement: Array<{ item: { "@type": string; url: string } }>;
    };
    expect(list.itemListElement[0]?.item["@type"]).toBe("MedicalCondition");
    expect(list.itemListElement[0]?.item.url).toContain("/indikation/");
  });

  it("inserts the Beschwerden parent into indication hub breadcrumbs", () => {
    const indication = dataset.indications[0]!;
    const jsonLd = buildCollectionJsonLd(
      "indication",
      indication,
      [],
      {
        listingCount: 0,
        priceStats: { count: 0, median: undefined, min: undefined, max: undefined },
        openLateCount: 0,
        openSundayCount: 0,
        mostRecentUpdate: undefined,
        updatedLast90Days: 0,
        offersByDuration: new Map(),
      },
    );
    const serialized = JSON.stringify(jsonLd);
    expect(serialized).toContain("/indikation");
    expect(serialized).toContain("Beschwerden");
    expect(serialized).toContain(indication.name);
  });
});
