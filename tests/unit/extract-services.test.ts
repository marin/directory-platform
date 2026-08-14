import { describe, it, expect } from "vitest";
import {
  extractServicesFromMarkdown,
  isUsableServiceName,
} from "../../src/lib/data/extract-services.ts";

describe("extractServicesFromMarkdown", () => {
  it("extracts headings and bullet services", () => {
    const markdown = `## Leistungen

### Akupunktur
Behandlung nach TCM.

- Erstgespräch und Anamnese
- TCM-Behandlung: ganzheitliche Therapie
- Schröpfen – klassische Methode
`;

    const services = extractServicesFromMarkdown(markdown);
    expect(services.map((s) => s.name)).toEqual([
      "Akupunktur",
      "Erstgespräch und Anamnese",
      "TCM-Behandlung",
      "Schröpfen",
    ]);
    expect(services[2]?.description).toContain("ganzheitliche");
  });

  it("drops nav, rooms, greetings and cookie labels", () => {
    const markdown = `### The practice
### Service
### Acupuncture
### Japanese Moxa
### Book Appointment

# Alexander Gluch
- Akupunktur…
- Hydrocolontherapie…
# Hallo und herzlich Willkommen!
# Nehmen Sie Kontakt mit uns auf

#### MEINE PRAXIS
## GROSSER THERAPIERAUM
## EINGANGSBEREICH
## KLEINER THERAPIERAUM
### Akupunktur bei Multipler Sklerose
### Bist du gespannt, was es als nächstes gibt?
`;

    const services = extractServicesFromMarkdown(
      markdown,
      "Alexander Gluch - Praxis für Osteopathie & Naturheilkunde",
    );
    expect(services.map((s) => s.name)).toEqual([
      "Acupuncture",
      "Japanese Moxa",
      "Akupunktur",
      "Hydrocolontherapie",
      "Akupunktur bei Multipler Sklerose",
    ]);
  });
});

describe("isUsableServiceName", () => {
  it("rejects the reported junk labels", () => {
    const junk = [
      "The practice",
      "Service",
      "Book Appointment",
      "Alexander Gluch",
      "Hallo und herzlich Willkommen!",
      "Nehmen Sie Kontakt mit uns auf",
      "MEINE PRAXIS",
      "GROSSER THERAPIERAUM",
      "EINGANGSBEREICH",
      "KLEINER THERAPIERAUM",
      "Bist du gespannt, was es als nächstes gibt?",
      "Kontakt",
      "Cookie-Richtlinie",
      "Herzlich Willkommen",
      "Praxis für Akupunktur & Kräuterheilkunde in Berlin Prenzlauer Berg",
      "氣 Qi – Fluss der Lebensenergie",
      "Ganzheitliches Behandlungsspektrum",
      "Info & Terminvereinbarung:",
      "Naturheilpraxis Kellin",
      "Mind/Behavior/Emotions:",
      "What my clients say",
      "AGAPE formats & offerings",
      "Therapy & Coaching",
      "Ceremonies & Rituals",
      "Circles & Craft",
    ];
    for (const name of junk) {
      expect(
        isUsableServiceName(
          name,
          name.includes("Kellin")
            ? "Anna Katharina Kellin - Naturheilpraxis Kellin"
            : name.includes("AGAPE") || name.includes("Therapy") || name.includes("Mind")
              ? "AGAPE - ganzheitliche Traumatherapie"
              : "Akupunktur & Kräuterheilkunde",
        ),
      ).toBe(false);
    }
  });

  it("keeps real treatments", () => {
    expect(isUsableServiceName("Akupunktur")).toBe(true);
    expect(isUsableServiceName("Hydrocolontherapie")).toBe(true);
    expect(isUsableServiceName("Somatic Experiencing bei Sozialphobie")).toBe(true);
    expect(isUsableServiceName("Alexander Gluch")).toBe(false);
  });
});
