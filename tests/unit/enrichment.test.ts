import { describe, it, expect } from "vitest";
import { buildGroundingContext, stripMarkdownForPrompt, usableExcerptText } from "../../src/lib/data/build-grounding-context.ts";
import { checkGrounding } from "../../src/lib/data/grounding.ts";
import { isNapFaqItem } from "../../src/lib/data/extract-about.ts";
import { buildFixtureFaq, extractFaqTopics } from "../../src/lib/data/extract-faq-topics.ts";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";

describe("buildGroundingContext", () => {
  it("strips nav lines and builds context from entry and markdown", () => {
    const entry = entrySchema.parse({
      id: "test",
      slug: "test",
      name: "Praxis Tong",
      description: "Template",
      lastUpdated: "2026-08-13",
      categories: ["akupunktur-tcm"],
      address: {
        street: "Wichernstraße 46",
        locality: "Berlin",
        region: "Berlin",
        postalCode: "13587",
        country: "DE",
      },
      offers: [{ name: "Achtsame Akupunktur", price: 80, priceLabel: "80 €" }],
    });

    const context = buildGroundingContext(entry, {
      markdown: "- [Home](https://example.com/)\n\n## Achtsame Akupunktur\n\nGanzheitliche Behandlung in Berlin-Spandau.",
      manifest: { url: "https://example.com/", metadata: { title: "Praxis Tong" } },
      extracted: {
        images: [],
        bookingUrl: "https://example.com/kontakt/",
        offers: [{ name: "Achtsame Akupunktur" }],
        flags: { charCount: 1000, thin: false, spam: false },
      },
    });

    expect(context.pageTitle).toBe("Praxis Tong");
    expect(context.bookingUrl).toBe("https://example.com/kontakt/");
    expect(context.offers[0]?.priceLabel).toBe("80 €");
    expect(context.websiteExcerpt).not.toContain("[Home]");
    expect(stripMarkdownForPrompt("- [Home](https://example.com/)\n\nText")).toBe("Text");
  });

  it("strips cookie consent lines from excerpts", () => {
    const excerpt = stripMarkdownForPrompt(
      'We use cookies to enhance your browsing experience.\n\nChinese medicine searches for the root of the problem.',
    );
    expect(excerpt).toContain("Chinese medicine");
    expect(excerpt).not.toMatch(/cookie/i);
  });

  it("counts skip links and short nav as unusable excerpt", () => {
    const text = usableExcerptText(
      "[Zum Inhalt springen](https://example.com/#main)\n\nHerzlichen Willkommen in meiner Praxis für Akupunktur und Moxa in Berlin-Spandau.",
    );
    expect(text).toContain("Akupunktur");
    expect(text).not.toMatch(/Zum Inhalt springen/i);
  });
});

describe("checkGrounding EUR", () => {
  it("accepts euro prices present in input", () => {
    const result = checkGrounding("Eine Sitzung kostet 80 €.", {
      offers: [{ name: "Sitzung", price: 80, priceLabel: "80 €" }],
    });
    expect(result.passed).toBe(true);
  });

  it("flags fabricated euro prices", () => {
    const result = checkGrounding("Eine Sitzung kostet 120 €.", {
      offers: [{ name: "Sitzung", price: 80, priceLabel: "80 €" }],
    });
    expect(result.passed).toBe(false);
  });

  it("accepts german phones with different spacing in input", () => {
    const result = checkGrounding("Handy 0172 9017429", {
      phone: "03061643831",
      websiteExcerpt: "Telefon 030 616 43 831\nHandy 0172 901 74 29",
    });
    expect(result.passed).toBe(true);
  });

  it("accepts phones with trailing whitespace in generated text", () => {
    const result = checkGrounding("Rufen Sie uns an: 0172 9017429 ", {
      websiteExcerpt: "Handy 0172 901 74 29",
    });
    expect(result.passed).toBe(true);
  });

  it("accepts colon times when input uses dot notation", () => {
    const result = checkGrounding("Dienstag von 10:00 bis 13:00 Uhr.", {
      websiteExcerpt: "Dienstag von 10.00 -13.00 und 14.00-18.00 Uhr",
    });
    expect(result.passed).toBe(true);
  });

  it("accepts colon times when input uses hour ranges", () => {
    const result = checkGrounding("Montag bis Freitag von 08:00 bis 20:00 Uhr.", {
      websiteExcerpt: "Montag - Freitag von 8 - 20 Uhr in Absprache.",
    });
    expect(result.passed).toBe(true);
  });

  it("accepts end-of-range hours from open consultation times", () => {
    const result = checkGrounding("Mittwochs von 10:00 bis 13:00 Uhr.", {
      websiteExcerpt: "Mittwochs von 10-13 Uhr biete ich eine offene Sprechstunde an.",
    });
    expect(result.passed).toBe(true);
  });
});

describe("fixture FAQ from website topics", () => {
  it("writes topic questions from snippets and skips NAP", () => {
    const topics = extractFaqTopics({
      markdown:
        "Die Anamnese dauert 60 Minuten. Ich rechne ausschließlich auf Privatrechnung ab. Treatment in English is possible.",
    });
    const faq = buildFixtureFaq(topics);

    expect(faq.length).toBeGreaterThan(0);
    expect(faq.every((item) => !isNapFaqItem(item))).toBe(true);
    expect(faq.some((item) => item.question.includes("Ersttermin") || item.answer.includes("Anamnese"))).toBe(true);

    const grounding = checkGrounding(
      faq.map((item) => `${item.question} ${item.answer}`).join("\n"),
      { topics },
    );
    expect(grounding.passed).toBe(true);
  });
});
