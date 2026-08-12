import { describe, it, expect } from "vitest";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import { normalizePhone } from "../../src/lib/data/normalize.ts";
import { hasSubstantiveChange } from "../../src/lib/freshness/substantive-change.ts";
import { computeCategoryStats } from "../../src/lib/aggregates/compute.ts";
import { checkGrounding } from "../../src/lib/data/grounding.ts";
import { findSimilarPairs } from "../../src/lib/data/uniqueness.ts";
import { serializeJsonLd } from "../../src/lib/seo/serialize-json-ld.ts";
import { emitVercelRedirects } from "../../src/lib/routing/redirects.ts";
import { mergeProposal } from "../../src/lib/data/merge.ts";

describe("entry schema", () => {
  it("validates a minimal entry", () => {
    const entry = entrySchema.parse({
      id: "test",
      slug: "test",
      name: "Test",
      description: "A test provider.",
      lastUpdated: "2026-08-01",
      categories: ["wellness-massage"],
    });
    expect(entry.status).toBe("open");
  });
});

describe("normalize", () => {
  it("normalizes US phone to E.164", () => {
    expect(normalizePhone("(512) 555-0100", "US")).toBe("+15125550100");
  });
});

describe("substantive change", () => {
  it("ignores lastUpdated-only changes", () => {
    const current = {
      id: "a",
      slug: "a",
      name: "A",
      description: "Desc",
      lastUpdated: "2026-01-01",
      categories: ["wellness-massage"],
    };
    const proposed = { ...current, lastUpdated: "2026-08-01" };
    expect(hasSubstantiveChange(current, proposed)).toBe(false);
  });

  it("detects description changes", () => {
    const current = {
      id: "a",
      slug: "a",
      name: "A",
      description: "Old",
      lastUpdated: "2026-01-01",
      categories: ["wellness-massage"],
    };
    const proposed = { ...current, description: "New" };
    expect(hasSubstantiveChange(current, proposed)).toBe(true);
  });
});

describe("aggregates", () => {
  it("excludes closed listings", () => {
    const entries = [
      {
        isOpen: true,
        status: "open" as const,
        categories: ["wellness-massage"],
        areaIds: [],
        offers: [{ name: "Session", durationMinutes: 60, price: 80 }],
        openingHours: [],
        lastUpdated: "2026-08-01",
      },
      {
        isOpen: false,
        status: "closed" as const,
        categories: ["wellness-massage"],
        areaIds: [],
        offers: [],
        openingHours: [],
        lastUpdated: "2026-08-01",
      },
    ];
    const stats = computeCategoryStats(entries as never, "wellness-massage");
    expect(stats.listingCount).toBe(1);
  });
});

describe("grounding", () => {
  it("flags fabricated prices", () => {
    const result = checkGrounding("Sessions start at $999.", { name: "Test", offers: [{ name: "Session", price: 85 }] });
    expect(result.passed).toBe(false);
  });
});

describe("uniqueness", () => {
  it("flags near-duplicate text", () => {
    const pairs = findSimilarPairs(
      [
        { id: "a", text: "Austin wellness massage provider with licensed staff and transparent pricing." },
        { id: "b", text: "Austin wellness massage provider with licensed staff and transparent pricing." },
      ],
      0.5,
    );
    expect(pairs.length).toBeGreaterThan(0);
  });
});

describe("JSON-LD serializer", () => {
  it("escapes script-breaking characters", () => {
    const out = serializeJsonLd({ name: "<script>alert(1)</script>" });
    expect(out).not.toContain("<script>");
    expect(out).toContain("\\u003c");
  });
});

describe("redirects", () => {
  it("emits vercel redirect format", () => {
    const config = emitVercelRedirects([
      { from: "/provider/old", to: "/category/wellness-massage", status: 301 },
    ]);
    expect(config.redirects[0]).toEqual({
      source: "/provider/old",
      destination: "/category/wellness-massage",
      permanent: true,
    });
  });
});

describe("merge", () => {
  it("retains existing approved values", () => {
    const current = { name: "Kept Name", phone: "+15125550100" };
    const extracted = { name: "New Name", phone: "+15125550999" };
    const { merged, diff } = mergeProposal(current, {}, extracted);
    expect(merged.name).toBe("Kept Name");
    expect(diff.some((d) => d.field === "phone")).toBe(true);
  });
});
