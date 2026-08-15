import { describe, it, expect } from "vitest";
import siteConfig from "../../config/site.config.ts";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import { findSimilarPairs } from "../../src/lib/data/uniqueness.ts";
import {
  buildIndicationHubCopy,
  indicationHubTitle,
} from "../../src/lib/data/indication-hubs.ts";
import { computeIndicationStats } from "../../src/lib/aggregates/compute.ts";
import { indicationPath, indicationUrl } from "../../src/lib/routing/paths.ts";
import { shouldIndexIndication } from "../../src/lib/data/view-models/entry.ts";

describe("indication paths", () => {
  it("builds hub and paginated paths", () => {
    expect(indicationPath("kinderwunsch")).toBe("/indikation/kinderwunsch");
    expect(indicationPath("kinderwunsch", 2)).toBe("/indikation/kinderwunsch/2");
    expect(indicationUrl("kinderwunsch")).toBe(
      `${siteConfig.site.origin}/indikation/kinderwunsch`,
    );
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
