import { describe, it, expect } from "vitest";
import siteConfig from "../../config/site.config.ts";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import { findSimilarPairs } from "../../src/lib/data/uniqueness.ts";
import {
  buildAssociationHubCopy,
  buildAssociationsIndexCopy,
  associationHubTitle,
  associationsIndexTitle,
} from "../../src/lib/data/association-hubs.ts";
import { computeAssociationStats } from "../../src/lib/aggregates/compute.ts";
import {
  associationPath,
  associationUrl,
  associationsPath,
  associationsUrl,
} from "../../src/lib/routing/paths.ts";
import { shouldIndexAssociation } from "../../src/lib/data/view-models/entry.ts";
import {
  buildAssociationsIndexJsonLd,
  buildCollectionJsonLd,
} from "../../src/lib/seo/structured-data/builders.ts";

describe("association paths", () => {
  it("builds hub and paginated paths", () => {
    expect(associationPath("vod")).toBe("/verband/vod");
    expect(associationPath("vod", 2)).toBe("/verband/vod/2");
    expect(associationUrl("vod")).toBe(`${siteConfig.site.origin}/verband/vod`);
  });

  it("builds the association index path", () => {
    expect(associationsPath()).toBe("/verband");
    expect(associationsUrl()).toBe(`${siteConfig.site.origin}/verband`);
  });
});

describe("shouldIndexAssociation", () => {
  it("indexes at the configured minimum and noindexes thin hubs", () => {
    const min = siteConfig.quality.minListingsForAssociationPage;
    expect(shouldIndexAssociation(0)).toEqual({ index: false, noindex: false });
    expect(shouldIndexAssociation(min - 1)).toEqual({ index: false, noindex: true });
    expect(shouldIndexAssociation(min)).toEqual({ index: true, noindex: false });
  });
});

describe("association hub copy", () => {
  const dataset = loadDataset();

  it("uses the directory title formula", () => {
    const vod = dataset.associations.find((item) => item.id === "vod");
    const shz = dataset.associations.find((item) => item.id === "shz");
    expect(vod).toBeDefined();
    expect(shz).toBeDefined();
    expect(associationHubTitle(vod!)).toBe("Heilpraktiker im VOD in Berlin");
    expect(associationHubTitle(shz!)).toBe("Heilpraktiker mit SHZ-Zertifikat in Berlin");
  });

  it("keeps intros unique across hubs with members", () => {
    const intros = dataset.associations
      .filter(
        (association) =>
          computeAssociationStats(dataset.entries, association.id).listingCount > 0,
      )
      .map((association) => ({
        id: association.id,
        text: buildAssociationHubCopy(
          association,
          dataset.entries,
          dataset.areas,
          dataset.categories,
        ).intro,
      }));

    expect(intros.length).toBeGreaterThan(1);
    expect(findSimilarPairs(intros, siteConfig.quality.uniquenessThreshold)).toEqual([]);
  });

  it("grounds intros in listing counts and taxonomy, not medical advice", () => {
    const association = dataset.associations.find((item) => item.id === "vod");
    expect(association).toBeDefined();
    const stats = computeAssociationStats(dataset.entries, association!.id);
    const copy = buildAssociationHubCopy(
      association!,
      dataset.entries,
      dataset.areas,
      dataset.categories,
    );
    expect(copy.intro).toContain(String(stats.listingCount));
    expect(copy.intro).toContain("Berlin");
    expect(copy.intro).toContain("VOD");
    expect(copy.faq[0]?.question).toContain("VOD");
    expect(copy.intro.toLowerCase()).not.toMatch(/heilung|diagnose|verschreib/);
    expect(copy.faq.map((item) => item.answer.toLowerCase()).join(" ")).not.toMatch(
      /heilung|diagnose|verschreib/,
    );
  });
});

describe("associations index copy", () => {
  const dataset = loadDataset();
  const copy = buildAssociationsIndexCopy(dataset.entries, dataset.associations);

  it("uses the directory title formula", () => {
    expect(associationsIndexTitle()).toBe("Heilpraktiker nach Verband in Berlin");
    expect(copy.title).toBe("Heilpraktiker nach Verband in Berlin");
  });

  it("grounds intro in counts and locality, not medical advice", () => {
    expect(copy.hubs.length).toBeGreaterThan(0);
    expect(copy.intro).toContain(String(copy.hubs.length));
    expect(copy.intro).toContain(String(copy.taggedListingCount));
    expect(copy.intro).toContain("Berlin");
    expect(copy.intro.toLowerCase()).not.toMatch(/heilung|diagnose|verschreib/);
    expect(copy.description.length).toBeLessThanOrEqual(160);
  });

  it("lists only indexable hubs and answers with directory facts", () => {
    expect(copy.hubs.every((hub) => shouldIndexAssociation(hub.count).index)).toBe(true);
    expect(copy.faq.length).toBeGreaterThanOrEqual(2);
    expect(copy.faq[0]?.answer).toContain(copy.hubs[0]!.name);
    expect(copy.faq[1]?.answer).toContain(String(copy.taggedListingCount));
  });
});

describe("associations index JSON-LD", () => {
  const dataset = loadDataset();
  const copy = buildAssociationsIndexCopy(dataset.entries, dataset.associations);

  it("emits CollectionPage, ItemList of Organization, FAQ and breadcrumbs", () => {
    const jsonLd = buildAssociationsIndexJsonLd(
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
    expect(list.itemListElement[0]?.item["@type"]).toBe("Organization");
    expect(list.itemListElement[0]?.item.url).toContain("/verband/");
  });

  it("inserts the Verbände parent into association hub breadcrumbs", () => {
    const association = dataset.associations.find((item) => item.id === "vod")!;
    const jsonLd = buildCollectionJsonLd(
      "association",
      association,
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
    expect(serialized).toContain("/verband");
    expect(serialized).toContain("Verbände");
    expect(serialized).toContain(association.name);
  });
});
