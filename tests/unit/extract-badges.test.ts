import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  detectsHpp,
  detectsKinder,
  extractEntryBadgeIds,
} from "../../src/lib/data/extract-badges.ts";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";

const ROOT = join(import.meta.dirname, "../../");

function loadEntry(slug: string) {
  return entrySchema.parse(
    JSON.parse(readFileSync(join(ROOT, `data/entries/${slug}.json`), "utf-8")),
  );
}

describe("detectsHpp", () => {
  it("matches the legal title in the practice name", () => {
    expect(
      detectsHpp({
        name: "Dirk Jacobs - Heilpraktiker für Psychotherapie",
        description: "Praxis in Berlin.",
      }),
    ).toBe(true);
  });

  it("matches Heilpraktikerin Psychotherapie without für", () => {
    expect(
      detectsHpp({
        name: "Heilpraktikerin Psychotherapie Steglitz",
        description: "Praxis in Berlin-Steglitz.",
      }),
    ).toBe(true);
  });

  it("matches the title in the description when the name is a brand", () => {
    expect(
      detectsHpp({
        name: "Anja Bäumer – Raum für Vertrauen",
        description:
          "Anja Bäumer – Raum für Vertrauen ist eine Heilpraktikerin für Psychotherapie in Berlin-Lichtenberg.",
      }),
    ).toBe(true);
  });

  it("does not tag a full Heilpraktiker who also offers psychotherapy", () => {
    expect(
      detectsHpp({
        name: "Naturheilpraxis Müller",
        description:
          "Die Heilpraktikerin bietet Naturheilkunde, Homöopathie und Psychotherapie an.",
      }),
    ).toBe(false);
  });

  it("tags a real HPP listing", () => {
    const entry = loadEntry("dirk-jacobs-heilpraktiker-fur-psychotherapie");
    expect(detectsHpp(entry)).toBe(true);
    expect(extractEntryBadgeIds(entry)).toContain("hpp");
  });
});

describe("detectsKinder", () => {
  it("matches Kinderosteopathie in the name", () => {
    expect(
      detectsKinder({
        name: "Praxis für Osteopathie und Kinderosteopathie Kerstin Grützmacher",
        description: "Osteopathie in Berlin.",
      }),
    ).toBe(true);
  });

  it("matches treatments for children and adults", () => {
    expect(
      detectsKinder({
        name: "AGA Heilpraxis",
        description:
          "Die Praxis bietet Osteopathie für Erwachsene, Kinder und Babys sowie Homöopathie an.",
      }),
    ).toBe(true);
  });

  it("does not treat Kinderwunsch as treating children", () => {
    expect(
      detectsKinder({
        name: "Frauengesundheit und Kinderwunsch - Heilpraktikerin Dipl.-Psych. Iris Lemke",
        description: "Naturheilkundliche Begleitung bei Kinderwunsch in Berlin.",
      }),
    ).toBe(false);
  });

  it("does not tag generic copy", () => {
    expect(
      detectsKinder({
        name: "Heilpraktiker Müller",
        description: "Ist ein Heilpraktiker in Berlin mit Schwerpunkt Naturheilkunde.",
      }),
    ).toBe(false);
  });

  it("tags a real pediatric osteopathy listing", () => {
    const entry = loadEntry(
      "praxis-fur-osteopathie-und-kinderosteopathie-kerstin-grutzmacher",
    );
    expect(detectsKinder(entry)).toBe(true);
    expect(extractEntryBadgeIds(entry)).toContain("kinder");
  });
});
