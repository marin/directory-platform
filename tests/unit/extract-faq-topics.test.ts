import { describe, it, expect } from "vitest";
import {
  buildFixtureFaq,
  extractFaqTopics,
  keepTopicFaqs,
} from "../../src/lib/data/extract-faq-topics.ts";

describe("extractFaqTopics", () => {
  it("extracts ersttermin from anamnesis copy", () => {
    const topics = extractFaqTopics({
      markdown:
        "Deshalb müssen Sie sich für die Anamnese 1 Stunde Zeit nehmen. Dabei behandle ich ausschließlich individuell.",
    });
    expect(topics.map((t) => t.topic)).toContain("ersttermin");
    expect(topics.find((t) => t.topic === "ersttermin")?.snippets[0]).toMatch(/Anamnese/);
  });

  it("extracts dauer from minutes in the text", () => {
    const topics = extractFaqTopics({
      markdown: "Shiatsu Massage 60 Min. und 90 Min. Die Zeit beinhaltet ein kurzes Vorgespräch.",
    });
    expect(topics.map((t) => t.topic)).toContain("dauer");
  });

  it("extracts dauer from offer duration labels", () => {
    const topics = extractFaqTopics({
      markdown: "Willkommen in der Praxis.",
      offers: [{ name: "Shiatsu", durationLabel: "60 Minuten" }],
    });
    const dauer = topics.find((t) => t.topic === "dauer");
    expect(dauer?.snippets[0]).toContain("60 Minuten");
  });

  it("extracts selbstzahler from Privatrechnung, not from a price alone", () => {
    const withPolicy = extractFaqTopics({
      markdown: "Beachten Sie bitte, dass ich ausschließlich auf Privatrechnung abrechne.",
    });
    expect(withPolicy.map((t) => t.topic)).toContain("selbstzahler");

    const priceOnly = extractFaqTopics({
      markdown: "Akupunktur 80 € pro Sitzung. Willkommen in der Naturheilpraxis.",
      offers: [{ name: "Akupunktur", price: 80, priceLabel: "80 €" } as never],
    });
    expect(priceOnly.map((t) => t.topic)).not.toContain("selbstzahler");
  });

  it("does not treat seminar Gebühr as Selbstzahler", () => {
    const topics = extractFaqTopics({
      markdown:
        "Bei Rücktritt werden 50€ Bearbeitungsgebühren einbehalten. Danach ist die vollständige Gebühr zu zahlen.",
    });
    expect(topics.map((t) => t.topic)).not.toContain("selbstzahler");
  });

  it("extracts treatment languages, not a language switcher", () => {
    const spoken = extractFaqTopics({
      markdown:
        "If you are an english or spanish speaking Person, no problem, you can get treatment in English and Spanish.",
    });
    expect(spoken.map((t) => t.topic)).toContain("sprachen");

    const switcher = extractFaqTopics({
      markdown: "- [Home](https://example.com/)\n- [English](https://example.com/en)\n- [Deutsch](https://example.com/de)\n\nNaturheilkunde in Berlin.",
    });
    expect(switcher.map((t) => t.topic)).not.toContain("sprachen");
  });

  it("extracts kinderosteopathie and audience copy", () => {
    const specialty = extractFaqTopics({
      markdown: "Praxis für Osteopathie und Kinderosteopathie in Berlin-Pankow.",
    });
    expect(specialty.map((t) => t.topic)).toContain("kinder");

    const audience = extractFaqTopics({
      description: "Die Praxis bietet Osteopathie für Erwachsene, Kinder und Babys sowie Homöopathie an.",
    });
    expect(audience.map((t) => t.topic)).toContain("kinder");
  });

  it("does not treat Kinderwunsch as treating children", () => {
    const topics = extractFaqTopics({
      markdown: "Naturheilkundliche Begleitung bei Kinderwunsch in Berlin. Frauenheilkunde und Hormonsprechstunde.",
      description: "Frauengesundheit und Kinderwunsch.",
    });
    expect(topics.map((t) => t.topic)).not.toContain("kinder");
  });

  it("returns no topics when the website has none of the five facts", () => {
    const topics = extractFaqTopics({
      markdown: "Willkommen in der Naturheilpraxis. Ich behandle mit Akupunktur und Kräutern in Berlin-Mitte.",
    });
    expect(topics).toEqual([]);
  });

  it("skips cookie lines when collecting snippets", () => {
    const topics = extractFaqTopics({
      markdown:
        "We use cookies to enhance your browsing experience.\n\nDie erste Sitzung dauert 60 Minuten und beginnt mit einem Gespräch.",
    });
    const dauer = topics.find((t) => t.topic === "dauer");
    expect(dauer?.snippets.join(" ")).not.toMatch(/cookie/i);
    expect(topics.map((t) => t.topic)).toEqual(expect.arrayContaining(["ersttermin", "dauer"]));
  });
});

describe("keepTopicFaqs", () => {
  it("drops extra questions and keeps one FAQ per allowed topic", () => {
    const kept = keepTopicFaqs(
      [
        { question: "Wie lange dauert eine Behandlung?", answer: "Eine Sitzung dauert 60 Minuten." },
        { question: "Welche Diagnosemethoden werden verwendet?", answer: "Zunge und Puls." },
        { question: "Wie oft finden Sitzungen statt?", answer: "Zwei- bis viermal pro Monat." },
        { question: "Wie viele Sitzungen hat das 3er-Paket?", answer: "Drei Sitzungen à 60 Minuten." },
      ],
      ["dauer"],
    );
    expect(kept).toEqual([
      { question: "Wie lange dauert eine Behandlung?", answer: "Eine Sitzung dauert 60 Minuten." },
    ]);
  });
});

describe("buildFixtureFaq", () => {
  it("builds one question per topic from the first snippet", () => {
    const faq = buildFixtureFaq([
      {
        topic: "dauer",
        snippets: ["Shiatsu Massage 60 Min. und 90 Min. Die Zeit beinhaltet ein Vorgespräch."],
      },
    ]);
    expect(faq).toEqual([
      {
        question: "Wie lange dauert eine Behandlung?",
        answer: "Shiatsu Massage 60 Min. und 90 Min. Die Zeit beinhaltet ein Vorgespräch.",
      },
    ]);
  });
});
