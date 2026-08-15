import type { Entry } from "../validation/entry-schema.ts";
import type { Indication } from "../validation/indication-schema.ts";

export const MAX_INDICATIONS_PER_ENTRY = 6;

export type IndicationField = "name" | "description" | "offers" | "faq";

export interface IndicationMatch {
  id: string;
  snippet: string;
  field: IndicationField;
  synonym: string;
}

type SourceField = {
  field: IndicationField;
  text: string;
  requireCue: boolean;
};

const BOUNDARY_CLASS = "A-Za-zÄÖÜäöüß0-9";
const CUE_RE =
  /behandelt|behandlung|schwerpunkt|spezialisiert|therapie|unterstützung|unterstuetzung|begleitung|indikation|unter anderem|\bu\.?\s*a\.|hilft bei|beschwerden wie|fokus|anwendung/i;
const NEGATION_RE = /\b(?:nicht|keine|kein|keinen|keinem|keiner)\b/i;
const SNIPPET_RADIUS = 80;
const CUE_WINDOW = 140;
const NEGATION_WINDOW = 60;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function synonymPattern(synonym: string): string {
  return [...synonym.toLowerCase()]
    .map((char) => {
      if (char === "ä") return "(?:ä|ae)";
      if (char === "ö") return "(?:ö|oe)";
      if (char === "ü") return "(?:ü|ue)";
      if (char === "ß") return "(?:ß|ss)";
      return escapeRegExp(char);
    })
    .join("");
}

function matchRegExp(synonym: string): RegExp {
  const pattern = synonymPattern(synonym);
  return new RegExp(`(?<![${BOUNDARY_CLASS}])${pattern}(?![${BOUNDARY_CLASS}])`, "giu");
}

function windowBefore(text: string, index: number, size: number): string {
  return text.slice(Math.max(0, index - size), index);
}

function windowAround(text: string, index: number, length: number, size: number): string {
  const start = Math.max(0, index - size);
  const end = Math.min(text.length, index + length + size);
  return text.slice(start, end);
}

function isNegated(text: string, index: number): boolean {
  return NEGATION_RE.test(windowBefore(text, index, NEGATION_WINDOW));
}

function hasTreatmentCue(text: string, index: number, length: number): boolean {
  return CUE_RE.test(windowAround(text, index, length, CUE_WINDOW));
}

function snippetAt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + length + SNIPPET_RADIUS);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function sourceFields(
  entry: Pick<Entry, "name" | "description" | "offers" | "faq">,
): SourceField[] {
  const fields: SourceField[] = [
    { field: "name", text: entry.name, requireCue: false },
    { field: "description", text: entry.description, requireCue: true },
  ];

  for (const offer of entry.offers ?? []) {
    const text = [offer.name, offer.description].filter(Boolean).join(" — ");
    if (text.trim()) {
      fields.push({ field: "offers", text, requireCue: false });
    }
  }

  for (const item of entry.faq ?? []) {
    const text = `${item.question} ${item.answer}`.trim();
    if (text) {
      fields.push({ field: "faq", text, requireCue: true });
    }
  }

  return fields;
}

function findInField(
  indication: Indication,
  source: SourceField,
): IndicationMatch | undefined {
  const synonyms = [...indication.synonyms].sort((a, b) => b.length - a.length);
  for (const synonym of synonyms) {
    const regex = matchRegExp(synonym);
    for (const match of source.text.matchAll(regex)) {
      const index = match.index ?? 0;
      if (isNegated(source.text, index)) continue;
      if (source.requireCue && !hasTreatmentCue(source.text, index, match[0].length)) {
        continue;
      }
      return {
        id: indication.id,
        field: source.field,
        synonym,
        snippet: snippetAt(source.text, index, match[0].length),
      };
    }
  }
  return undefined;
}

export function extractIndications(
  entry: Pick<Entry, "name" | "description" | "offers" | "faq">,
  indications: Indication[],
  max = MAX_INDICATIONS_PER_ENTRY,
): IndicationMatch[] {
  const fields = sourceFields(entry);
  const matches: IndicationMatch[] = [];

  for (const indication of indications) {
    if (matches.length >= max) break;
    for (const field of fields) {
      const match = findInField(indication, field);
      if (match) {
        matches.push(match);
        break;
      }
    }
  }

  return matches;
}

export function indicationIdsFromMatches(matches: IndicationMatch[]): string[] {
  return matches.map((match) => match.id);
}
