import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractCredentials,
  formatCredentialsLine,
  formatAssociationChip,
  isVerbandListing,
} from "../../src/lib/data/extract-credentials.ts";
import { associationsFileSchema } from "../../src/lib/validation/association-schema.ts";

const ROOT = join(import.meta.dirname, "../../");
const associations = associationsFileSchema.parse(
  JSON.parse(readFileSync(join(ROOT, "data/associations.json"), "utf-8")),
);

function idsOf(markdown: string, name?: string) {
  return extractCredentials(markdown, associations, { listingName: name });
}

describe("isVerbandListing", () => {
  it("flags association organizations as listings", () => {
    expect(isVerbandListing("Union Deutscher Heilpraktiker Berlin-Brandenburg")).toBe(true);
    expect(isVerbandListing("Naturheilpraxis Müller")).toBe(false);
  });
});

describe("extractCredentials associations", () => {
  it("extracts VOD membership from an explicit sentence", () => {
    const result = idsOf(
      "Ich bin Mitglied im [Verband der Osteopathen Deutschland e.V.](http://osteopathie.de/)",
    );
    expect(result.associationIds).toEqual(["vod"]);
  });

  it("extracts BDH membership", () => {
    const result = idsOf(
      "Ich bin eingetragenes Mitglied beim Bund Deutscher Heilpraktiker e.V. (Mitgliedsnummer: 107832).",
    );
    expect(result.associationIds).toEqual(["bdh"]);
  });

  it("extracts AGTCM from a membership heading", () => {
    const result = idsOf("**Mitgliedschaft** - Arbeitsgemeinschaft für TCM (AGTCM)");
    expect(result.associationIds).toEqual(["agtcm"]);
  });

  it("extracts FDH and does not also tag VDH", () => {
    const result = idsOf(
      "Mitglied im Fachverband Deutscher Heilpraktiker e.V. | weitere Fortbildungen",
    );
    expect(result.associationIds).toEqual(["fdh"]);
    expect(result.associationIds).not.toContain("vdh");
  });

  it("extracts VFP membership", () => {
    const result = idsOf(
      "Berufsverband - Mitglied im Verband freier Psychotherapeuten (VFP) - Mitglied",
    );
    expect(result.associationIds).toEqual(["vfp"]);
  });

  it("ignores Familienmitglied", () => {
    const result = idsOf(
      "Verlust von Familienmitgliedern, Scheidung der Eltern etc. Sie strahlt viel Ruhe aus.",
    );
    expect(result.associationIds).toEqual([]);
  });

  it("does not treat a BAO certificate as BAO membership", () => {
    const result = idsOf(
      "Osteopathieausbildung an der IFAO in Berlin mit BAO Zertifikat, Mitglied im VOD",
    );
    expect(result.associationIds).toEqual(["vod"]);
  });

  it("ignores VOD footer copyright and member-area links", () => {
    const result = idsOf(
      "Gemäß Bundesdatenschutzgesetz widerspricht der Verband der Osteopathen Deutschland e.V. jeder kommerziellen und sonstigen Verwendung, Verarbeitung und Weitergabe dieser Daten. [Mitgliederbereich VOD-Net](https://www.osteopathie.de/vodn)",
    );
    expect(result.associationIds).toEqual([]);
  });

  it("ignores Verbandsmaterial", () => {
    const result = idsOf("Blutegel inkl. Verbandsmaterial je Egel 12 €");
    expect(result.associationIds).toEqual([]);
  });

  it("does not tag the UDH listing itself as a member", () => {
    const result = idsOf(
      "Bei Fragen zögern Sie nicht, uns zu kontaktieren. Mitglied werden im Landesverband.",
      "Union Deutscher Heilpraktiker Berlin-Brandenburg",
    );
    expect(result.associationIds).toEqual([]);
  });

  it("skips school-of-the-association without a membership cue on that match", () => {
    const schoolOnly = idsOf(
      "Dreijährige Vollzeitausbildung zur Heilpraktikerin an einer Schule des Fachverbandes Deutscher Heilpraktiker e.V. in Hochheim.",
    );
    expect(schoolOnly.associationIds).toEqual([]);
  });

  it("still extracts FDH when membership is stated after the school line", () => {
    const result = idsOf(
      "Ausbildung an einer Schule des Fachverbandes Deutscher Heilpraktiker e.V. in Hochheim. Mitglied im Fachverband Deutscher Heilpraktiker e.V.",
    );
    expect(result.associationIds).toEqual(["fdh"]);
  });
});

describe("extractCredentials qualifications", () => {
  it("extracts Diplom plus profession", () => {
    const result = idsOf("Sie ist Diplom-Physiotherapeutin und arbeitet in Pankow.");
    expect(result.qualifications).toContain("Diplom-Physiotherapeutin");
  });

  it("extracts Amtsarztprüfung", () => {
    const result = idsOf("Heilpraktikerausbildung und Amtsarztprüfung in Berlin");
    expect(result.qualifications).toContain("Amtsarztprüfung");
  });

  it("canonicalizes and dedupes EMDR labels", () => {
    const result = idsOf(
      "EMDR-Traumatherapeutin und später noch einmal EMDR - Traumatherapeutin sowie EMDR-THERAPEUTIN",
    );
    const emdr = result.qualifications.filter((item) => /EMDR/i.test(item));
    expect(new Set(emdr.map((item) => item.toLowerCase())).size).toBe(emdr.length);
    expect(emdr.some((item) => item === "EMDR-THERAPEUTIN")).toBe(false);
  });

  it("extracts EMDR therapist title", () => {
    const result = idsOf(
      "Ich bin Pascale Chartrain, Heilpraktikerin für Psychotherapie, EMDR-Traumatherapeutin (VDH) und Trauerbegleiterin.",
    );
    expect(result.qualifications.some((item) => /EMDR/i.test(item))).toBe(true);
  });

  it("extracts BKiD counsellor", () => {
    const result = idsOf("zertifizierte BKiD Kinderwunschberaterin, EMDR-Traumatherapeutin");
    expect(result.qualifications).toContain("BKiD-Kinderwunschberaterin");
  });

  it("ignores krankenkassenzertifizierte courses", () => {
    const result = idsOf(
      "Der aktuelle krankenkassenzertifizierte Kurs läuft vom 26.08.26. Diplom-Ausbildung in Yoga.",
    );
    expect(result.qualifications).toEqual([]);
  });

  it("ignores directory seals", () => {
    const result = idsOf(
      "https://www.therapeutenkatalog.de/images_siegel_certified_id/therapeutenkatalog_zertifikat_id-0000-3696.gif",
    );
    expect(result.qualifications).toEqual([]);
  });
});

describe("formatCredentialsLine", () => {
  it("joins qualifications and a single association", () => {
    const vod = associations.find((item) => item.id === "vod")!;
    expect(formatCredentialsLine(["Diplom-Physiotherapeutin"], [vod])).toBe(
      "Diplom-Physiotherapeutin. Mitglied im VOD.",
    );
  });

  it("joins two associations", () => {
    const fdh = associations.find((item) => item.id === "fdh")!;
    const agtcm = associations.find((item) => item.id === "agtcm")!;
    expect(formatCredentialsLine([], [fdh, agtcm])).toBe("Mitglied im FDH und im AGTCM.");
  });

  it("returns undefined when empty", () => {
    expect(formatCredentialsLine([], [])).toBeUndefined();
  });
});

describe("formatAssociationChip", () => {
  it("uses the abbreviation", () => {
    const vod = associations.find((item) => item.id === "vod")!;
    expect(formatAssociationChip(vod)).toBe("Mitglied im VOD");
  });
});
