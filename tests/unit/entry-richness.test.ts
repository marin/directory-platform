import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeEntryRichness,
  isBrokenBookingUrl,
  hasLocalHeroImage,
  sortEntriesByRichness,
} from "../../src/lib/data/entry-richness.ts";
import { normalizeEntry } from "../../src/lib/data/normalize-entry.ts";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import { templateDescription } from "../../src/lib/data/extract-about.ts";

const ROOT = join(import.meta.dirname, "../../");

function loadEntry(slug: string) {
  const raw = JSON.parse(readFileSync(join(ROOT, `data/entries/${slug}.json`), "utf-8"));
  return normalizeEntry(entrySchema.parse(raw));
}

describe("isBrokenBookingUrl", () => {
  it("flags empty and malformed URLs", () => {
    expect(isBrokenBookingUrl(undefined)).toBe(true);
    expect(isBrokenBookingUrl("")).toBe(true);
    expect(isBrokenBookingUrl("https://example.com/kontakt.html%20%22Kontakt")).toBe(true);
    expect(isBrokenBookingUrl("https://example.com/book ")).toBe(true);
  });

  it("accepts valid booking URLs", () => {
    expect(isBrokenBookingUrl("https://www.doctolib.de/booking")).toBe(false);
  });
});

describe("hasLocalHeroImage", () => {
  it("detects local prepared images", () => {
    expect(
      hasLocalHeroImage("test-slug", ["/images/entries/test-slug/0.webp"]),
    ).toBe(true);
    expect(hasLocalHeroImage("test-slug", ["https://example.com/photo.jpg"])).toBe(false);
  });
});

describe("computeEntryRichness", () => {
  it("scores template entries as tier D", () => {
    const entry = normalizeEntry(
      entrySchema.parse({
        id: "thin",
        slug: "thin",
        name: "Thin Entry",
        description: templateDescription("Thin Entry", ["akupunktur-tcm"]),
        lastUpdated: "2026-08-14",
        categories: ["akupunktur-tcm"],
        faq: [],
        offers: [],
        images: [],
      }),
    );

    const richness = computeEntryRichness(entry);
    expect(richness.description).toBe(0);
    expect(richness.tier).toBe("D");
    expect(richness.total).toBeLessThan(10);
  });

  it("scores enriched entries as tier A", () => {
    const entry = normalizeEntry(
      entrySchema.parse({
        id: "rich",
        slug: "rich",
        name: "Rich Entry",
        description:
          "A long custom description about holistic practice and therapies offered in Berlin with enough detail to exceed two hundred characters for the richness bonus points in scoring. The practice treats adults with acupuncture and herbal medicine.",
        lastUpdated: "2026-08-15",
        categories: ["naturheilkunde"],
        faq: [
          { question: "Wie läuft der Ersttermin ab?", answer: "Die Anamnese dauert eine Stunde." },
          { question: "Wie lange dauert eine Behandlung?", answer: "Eine Sitzung dauert 60 Minuten." },
          { question: "Übernimmt die Krankenkasse die Kosten?", answer: "Die Praxis rechnet auf Privatrechnung ab." },
          { question: "Werden auch Kinder behandelt?", answer: "Ja, auch Säuglinge und Kinder." },
        ],
        offers: [{ name: "Akupunktur", price: 80, priceLabel: "80 €", description: "Nadeltherapie" }],
        images: ["/images/entries/rich/0.webp"],
        bookingUrl: "https://example.com/book",
        indicationIds: ["rueckenschmerzen", "migraene", "allergien", "schlafstoerungen"],
      }),
    );
    const richness = computeEntryRichness(entry);
    expect(richness.tier).toBe("A");
    expect(richness.total).toBeGreaterThanOrEqual(60);
    expect(richness.description).toBe(30);
    expect(richness.faq).toBe(20);
  });

  it("adds a credentials bonus when associations or qualifications exist", () => {
    const entry = normalizeEntry(
      entrySchema.parse({
        id: "creds",
        slug: "creds",
        name: "Creds Entry",
        description: "Custom description.",
        lastUpdated: "2026-08-15",
        categories: ["naturheilkunde"],
        associationIds: ["vod"],
        qualifications: ["Diplom-Physiotherapeutin"],
      }),
    );
    const richness = computeEntryRichness(entry);
    expect(richness.credentials).toBe(5);
  });

  it("scores the former natology template entry as enriched after custom description", () => {
    const entry = loadEntry(
      "natology-heilpraktiker-functional-medicine-prenzlauer-berg",
    );
    const richness = computeEntryRichness(entry);
    expect(richness.tier).toBe("B");
    expect(richness.description).toBeGreaterThan(0);
    expect(richness.bookingUrl).toBe(5);
  });
});

describe("sortEntriesByRichness", () => {
  it("orders by score, then lastUpdated, then name", () => {
    const rich = normalizeEntry(
      entrySchema.parse({
        id: "rich",
        slug: "rich",
        name: "Rich Entry",
        description: "A long custom description about holistic practice and therapies offered in Berlin with enough detail to exceed two hundred characters for the richness bonus points in scoring.",
        lastUpdated: "2026-08-10",
        categories: ["naturheilkunde"],
        faq: [{ question: "Q1?", answer: "Answer with enough length here." }],
        offers: [{ name: "Therapy", price: 80, priceLabel: "80 €" }],
        images: ["/images/entries/rich/0.webp"],
        bookingUrl: "https://example.com/book",
      }),
    );
    const medium = normalizeEntry(
      entrySchema.parse({
        id: "medium",
        slug: "medium",
        name: "Medium Entry",
        description: "Custom but shorter description.",
        lastUpdated: "2026-08-14",
        categories: ["naturheilkunde"],
      }),
    );
    const thin = normalizeEntry(
      entrySchema.parse({
        id: "thin",
        slug: "thin",
        name: "Thin Entry",
        description: templateDescription("Thin Entry", ["naturheilkunde"]),
        lastUpdated: "2026-08-14",
        categories: ["naturheilkunde"],
      }),
    );

    const sorted = sortEntriesByRichness([thin, medium, rich]);
    expect(sorted.map((entry) => entry.slug)).toEqual(["rich", "medium", "thin"]);
  });
});
