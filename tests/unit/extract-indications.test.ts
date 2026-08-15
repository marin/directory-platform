import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractIndications,
  indicationIdsFromMatches,
  synonymPattern,
} from "../../src/lib/data/extract-indications.ts";
import { indicationsFileSchema } from "../../src/lib/validation/indication-schema.ts";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";

const ROOT = join(import.meta.dirname, "../..");
const indications = indicationsFileSchema.parse(
  JSON.parse(readFileSync(join(ROOT, "data/indications.json"), "utf-8")),
);

function idsFor(entry: Parameters<typeof extractIndications>[0]): string[] {
  return indicationIdsFromMatches(extractIndications(entry, indications));
}

describe("synonymPattern", () => {
  it("matches umlaut and ASCII spellings", () => {
    const pattern = new RegExp(synonymPattern("Schilddrüse"), "i");
    expect(pattern.test("Schilddrüse")).toBe(true);
    expect(pattern.test("Schilddruese")).toBe(true);
  });
});

describe("extractIndications", () => {
  it("tags offer names that are conditions", () => {
    const ids = idsFor({
      name: "Naturheilpraxis Beispiel",
      description: "Heilpraktikerin in Berlin.",
      offers: [{ name: "Verdauungsbeschwerden" }, { name: "Akupunktur" }],
    });
    expect(ids).toContain("darm");
    expect(ids).not.toContain("allergien");
  });

  it("requires a treatment cue in descriptions", () => {
    const withoutCue = idsFor({
      name: "Naturheilpraxis Beispiel",
      description: "Die Therapeutin hatte selbst Depressionen in der Jugend.",
    });
    expect(withoutCue).not.toContain("depression");

    const withCue = idsFor({
      name: "Naturheilpraxis Beispiel",
      description: "Die Praxis behandelt Depressionen und Angstzustände.",
    });
    expect(withCue).toContain("depression");
  });

  it("does not treat Darmstadt as Darm", () => {
    const ids = idsFor({
      name: "Naturheilpraxis Darmstadt",
      description: "Heilpraktikerin mit Praxis in Darmstadt.",
      offers: [{ name: "Osteopathie" }],
    });
    expect(ids).not.toContain("darm");
  });

  it("skips negated mentions", () => {
    const ids = idsFor({
      name: "Naturheilpraxis Beispiel",
      description: "Die Praxis behandelt keine Depressionen und keine Allergien.",
    });
    expect(ids).not.toContain("depression");
    expect(ids).not.toContain("allergien");
  });

  it("tags Kinderwunsch from the practice name", () => {
    const ids = idsFor({
      name: "Ganzheitliche Kinderwunsch-Behandlung Berlin",
      description: "Naturheilkundliche Praxis in Pankow.",
    });
    expect(ids).toEqual(["kinderwunsch"]);
  });

  it("tags FAQ answers that list treated conditions", () => {
    const ids = idsFor({
      name: "Praxis Szewczyk",
      description: "TCM-Praxis in Berlin.",
      faq: [
        {
          question: "Welche Beschwerden werden behandelt?",
          answer:
            "Unter anderem Frauengesundheit (Menstruationsbeschwerden, Kinderwunsch), Schmerzen und Allergien.",
        },
      ],
    });
    expect(ids).toEqual(
      expect.arrayContaining(["allergien", "kinderwunsch", "zyklus-hormone"]),
    );
  });

  it("does not invent tags for generic copy", () => {
    const ids = idsFor({
      name: "Heilpraktiker Müller",
      description: "Ist ein Heilpraktiker in Berlin mit Schwerpunkt Naturheilkunde.",
    });
    expect(ids).toEqual([]);
  });

  it("caps tags per entry", () => {
    const ids = idsFor({
      name: "Kinderwunsch Praxis",
      description:
        "Die Praxis behandelt Allergien, Burnout, Erschöpfung, Reizdarm, Migräne, Schlafstörungen, Depressionen, Hautprobleme, Rückenschmerzen, Wechseljahre, Schilddrüse, Endometriose und Übergewicht.",
      offers: [
        { name: "Verdauungsbeschwerden" },
        { name: "Heuschnupfen" },
        { name: "Migräne" },
      ],
    });
    expect(ids.length).toBeLessThanOrEqual(6);
    expect(ids[0]).toBe("allergien");
  });

  it("tags a real enriched entry from existing copy", () => {
    const raw = JSON.parse(
      readFileSync(
        join(
          ROOT,
          "data/entries/akupunktur-tcm-thetahealing-praxis-verena-szewczyk.json",
        ),
        "utf-8",
      ),
    );
    const entry = entrySchema.parse(raw);
    const ids = idsFor(entry);
    expect(ids).toEqual(
      expect.arrayContaining(["allergien", "kinderwunsch", "zyklus-hormone"]),
    );
  });
});
