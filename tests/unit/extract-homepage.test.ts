import { describe, it, expect } from "vitest";
import {
  extractBookingUrlFromHomepage,
  extractHomepage,
  extractImagesFromHomepage,
} from "../../src/lib/data/extract-homepage.ts";

const EXAMPLE_MARKDOWN = `- [DE](https://www.praxis-tong.de/ "Home")

# Praxis für Akupunktur, Energiearbeit & Trauma

Herzlichen Willkommen in meiner Praxis.

![](https://image.jimcdn.com/app/cms/image/transf/dimension=535x10000:format=jpg/path/s1d0c165f76396e52/image/ic964750725b760eb/version/1667642182/image.jpg)

## Achtsame Akupunktur

### Energie-Behandlungen

[Zur Kontaktseite](https://www.praxis-tong.de/kontakt/)
`;

describe("extractHomepage", () => {
  it("extracts images, booking URL, and service headings", () => {
    const result = extractHomepage(
      EXAMPLE_MARKDOWN,
      {
        "og:image": "https://example.com/favicon.ico",
        "twitter:image": "https://image.jimcdn.com/hero.jpg",
      },
      "https://www.praxis-tong.de/",
    );

    expect(result.images[0]).toContain("ic964750725b760eb");
    expect(result.bookingUrl).toBe("https://www.praxis-tong.de/kontakt/");
    expect(result.offers.map((offer) => offer.name)).toEqual([
      "Achtsame Akupunktur",
      "Energie-Behandlungen",
    ]);
    expect(result.flags.thin).toBe(true);
    expect(result.flags.spam).toBe(false);
  });

  it("drops practice/nav headings that are not services", () => {
    const result = extractHomepage(
      `## The practice\n\n## Service\n\n### Acupuncture\n\n### Book Appointment\n`,
    );
    expect(result.offers.map((offer) => offer.name)).toEqual(["Acupuncture"]);
  });

  it("prefers booking links over impressum pages", () => {
    const bookingUrl = extractBookingUrlFromHomepage(
      `[Impressum](https://example.com/impressum)\n[Termin buchen](https://example.com/kontakt/)`,
      "https://example.com/",
    );
    expect(bookingUrl).toBe("https://example.com/kontakt/");
  });

  it("filters favicon images from metadata", () => {
    const images = extractImagesFromHomepage(
      "",
      { "og:image": "https://example.com/favicon.ico" },
      "https://example.com/",
    );
    expect(images).toEqual([]);
  });
});
