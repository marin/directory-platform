import { describe, it, expect } from "vitest";
import { stripHtmlArtifacts } from "../../src/lib/data/strip-html-artifacts.ts";

describe("stripHtmlArtifacts", () => {
  it("removes malformed br tags glued to the next word", () => {
    expect(stripHtmlArtifacts("telefon. Beratung,<brAbrechnung n. Zeit / min")).toBe(
      "telefon. Beratung, Abrechnung n. Zeit / min",
    );
    expect(stripHtmlArtifacts("Anamnese und <brkörperlicher Untersuchung")).toBe(
      "Anamnese und körperlicher Untersuchung",
    );
  });

  it("removes well-formed br tags", () => {
    expect(stripHtmlArtifacts("Beratung<br/>Abrechnung")).toBe("Beratung Abrechnung");
    expect(stripHtmlArtifacts("Beratung<br>Abrechnung")).toBe("Beratung Abrechnung");
  });
});
