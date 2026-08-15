import { describe, it, expect } from "vitest";
import {
  descriptionFromAbout,
  extractAboutFromMarkdown,
  isBoilerplateDescription,
  isTemplateDescription,
  isNapFaqItem,
  sanitizeDirectoryText,
  sanitizeFaqItems,
  stripCookieSentences,
} from "../../src/lib/data/extract-about.ts";

describe("descriptionFromAbout", () => {
  it("filters legal boilerplate and builds a short description", () => {
    const description = descriptionFromAbout([
      "Für diese Präsentation im Sinne des geltenden Rechts ist verantwortlich:",
      "Ich begleite Menschen in Berlin ganzheitlich mit Naturheilkunde und Akupunktur.",
      "Seit über 15 Jahren arbeite ich als Heilpraktikerin mit Schwerpunkt Frauengesundheit.",
    ]);

    expect(description).toContain("Naturheilkunde");
    expect(description).not.toContain("geltenden Rechts");
  });

  it("skips cookie consent banners and uses the real bio", () => {
    const description = descriptionFromAbout([
      'We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
      "We use cookies to help you navigate efficiently and perform certain functions. You will find detailed information about all cookies under each consent category below.",
      "Chinese medicine searches for the root of the problem. I can help you search out and find this root. A health problem does not arise in isolation.",
    ]);

    expect(description).toContain("Chinese medicine");
    expect(description).not.toMatch(/cookie/i);
  });

  it("strips cookie sentences from mixed paragraphs", () => {
    const stripped = stripCookieSentences(
      "Die Naturheilpraxis Heike Schmidt befindet sich im Hotel Heilbrunnen. Diese Webseite verwendet Cookies, um Ihnen ein optimales Online-Erlebnis bieten zu können.",
    );
    expect(stripped).toContain("Hotel Heilbrunnen");
    expect(stripped).not.toMatch(/cookie/i);
  });

  it("strips CMP button labels glued onto a German bio", () => {
    const stripped = stripCookieSentences(
      "AkzeptierenAblehnenEinstellungen ansehenEinstellungen speichern In meiner Arbeit schaffe ich einen Raum nur für Sie.",
    );
    expect(stripped).toContain("Raum nur für Sie");
    expect(stripped).not.toMatch(/Akzeptieren|Einstellungen/i);
  });

  it("strips CMP chrome glued onto a real bio", () => {
    const stripped = stripCookieSentences(
      "Einstellungen für die Zustimmung anpassen I have been accompanying people in individual sessions for almost 20 years.",
    );
    expect(stripped).toContain("accompanying people");
    expect(stripped).not.toMatch(/Zustimmung/i);
  });

  it("detects template and cookie descriptions as boilerplate", () => {
    expect(
      isTemplateDescription(
        "Max Mustermann ist ein Heilpraktiker in Berlin mit Schwerpunkt akupunktur tcm. Kontakt, Adresse und Öffnungszeiten finden Sie in diesem Verzeichniseintrag.",
      ),
    ).toBe(true);
    expect(
      isBoilerplateDescription(
        "Die technische Speicherung oder der Zugriff ist für den rechtmäßigen Zweck der Speicherung von Präferenzen erforderlich.",
      ),
    ).toBe(true);
  });
});

describe("extractAboutFromMarkdown", () => {
  it("does not keep cookieyes banner paragraphs", () => {
    const markdown = `We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.

Chinese medicine searches for the root of the problem. I can help you search out and find this root with acupuncture and moxibustion.
`;
    const about = extractAboutFromMarkdown(markdown);
    expect(about.paragraphs.join(" ")).toContain("Chinese medicine");
    expect(about.paragraphs.join(" ")).not.toMatch(/cookie/i);
  });
});

describe("sanitizeDirectoryText", () => {
  it("removes markdown website links and pointer sentences from Über copy", () => {
    const sanitized = sanitizeDirectoryText(
      "Adelheid Henke ist eine erfahrene Heilpraktikerin in Berlin. Weitere Informationen finden Sie auf ihrer Website unter [adelheidhenke.de](https://adelheidhenke.de/).",
    );
    expect(sanitized).toContain("erfahrene Heilpraktikerin");
    expect(sanitized).not.toContain("adelheidhenke.de");
    expect(sanitized).not.toContain("Website");
    expect(sanitized).not.toContain("](");
  });
});

describe("sanitizeFaqItems", () => {
  it("drops website-only questions and markdown links", () => {
    const faq = sanitizeFaqItems([
      {
        question: "Wo befindet sich die Praxis?",
        answer: "In der Dickhardtstraße 48 in Berlin.",
      },
      {
        question: "Gibt es eine Website für weitere Informationen?",
        answer: "Ja, weitere Informationen finden Sie auf der Website https://adelheidhenke.de/.",
      },
      {
        question: "Wie kann ich einen Termin buchen?",
        answer: "Termine vereinbaren Sie telefonisch oder über die [Kontaktseite](https://example.com/kontakt).",
      },
    ]);

    expect(faq.map((item) => item.question)).toEqual([
      "Wo befindet sich die Praxis?",
      "Wie kann ich einen Termin buchen?",
    ]);
    expect(faq[1]?.answer).toContain("telefonisch");
    expect(faq[1]?.answer).not.toContain("](");
  });
});

describe("isNapFaqItem", () => {
  it("flags address, phone, hours, booking and therapy-list questions", () => {
    expect(isNapFaqItem({ question: "Wo befindet sich die Praxis?", answer: "In der Dickhardtstraße 48." })).toBe(true);
    expect(isNapFaqItem({ question: "Wie kann ich Jan Dunkel kontaktieren?", answer: "Telefonisch unter 030 123." })).toBe(true);
    expect(isNapFaqItem({ question: "Wie lauten die Öffnungszeiten der Praxis?", answer: "Montag bis Freitag." })).toBe(true);
    expect(isNapFaqItem({ question: "Wie kann ich einen Termin buchen?", answer: "Über Doctolib." })).toBe(true);
    expect(
      isNapFaqItem({
        question: "Welche Behandlungen werden angeboten?",
        answer: "Akupunktur und Shiatsu.",
      }),
    ).toBe(true);
    expect(isNapFaqItem({ question: "Wie kann ich einen Termin bei Günter Böwing buchen?", answer: "Über die Kontaktseite." })).toBe(true);
    expect(isNapFaqItem({ question: "Wann sind die Sprechzeiten von Peter Krauss?", answer: "Montag bis Donnerstag." })).toBe(true);
  });

  it("keeps first-appointment, duration, payer, language and children questions", () => {
    expect(isNapFaqItem({ question: "Wie läuft der Ersttermin ab?", answer: "Die Anamnese dauert eine Stunde." })).toBe(false);
    expect(isNapFaqItem({ question: "Wie lange dauert eine Behandlung?", answer: "60 Minuten." })).toBe(false);
    expect(isNapFaqItem({ question: "Übernimmt die Krankenkasse die Kosten?", answer: "Nein, Selbstzahler." })).toBe(false);
    expect(isNapFaqItem({ question: "Welche Sprachen werden in der Praxis gesprochen?", answer: "Deutsch und Englisch." })).toBe(false);
    expect(isNapFaqItem({ question: "Werden auch Kinder behandelt?", answer: "Ja, auch Säuglinge." })).toBe(false);
  });
});
