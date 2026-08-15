import { stripMarkdownFormatting } from "./extract-about.ts";
import { synonymPattern } from "./extract-indications.ts";
import type { Association } from "../validation/association-schema.ts";

export const MAX_ASSOCIATIONS_PER_ENTRY = 6;
export const MAX_QUALIFICATIONS_PER_ENTRY = 4;
export const MAX_QUALIFICATION_LABEL_LENGTH = 80;

const BOUNDARY_CLASS = "A-Za-zÄÖÜäöüß0-9";
const CUE_WINDOW = 180;
const SNIPPET_RADIUS = 100;

const MEMBER_CUE_RE =
  /\bMitglied(?:schaft|snummer)?\b(?!\s+werden)|\bangehörig(?:es|er|e)?\b|zertifiziert(?:e[rsn]?)?(?:\s+\w+){0,3}\s+bei/i;

const BAD_ASSOCIATION_BEFORE_RE = /schule des\s*$/i;
const BAD_ASSOCIATION_AROUND_RE =
  /widerspricht der verband|kommerziellen und sonstigen verwendung|verbandsmaterial|mitgliederbereich|jetzt mitglied|mitglied werden|familienmitglied|vod auf (?:facebook|instagram|x)|twitter\.com\/vodev|untere albrechtstr/i;

const BAD_QUALIFICATION_CONTEXT_RE =
  /krankenkassen?\s*zertifiziert|kassenzertifiziert|therapeutenkatalog|bietet?\s+(?:auch\s+)?ausbildungen|ausbildungen\s+an(?:bieten)?/i;

const VERBAND_LISTING_RE =
  /union deutscher heilpraktiker|bund deutscher heilpraktiker|fachverband deutscher heilpraktiker|freier verband deutscher heilpraktiker|(?<!freier )verband deutscher heilpraktiker/i;

export type AssociationMatch = {
  id: string;
  synonym: string;
  snippet: string;
};

export type QualificationMatch = {
  label: string;
  snippet: string;
};

export type CredentialExtraction = {
  associationIds: string[];
  qualifications: string[];
  associationMatches: AssociationMatch[];
  qualificationMatches: QualificationMatch[];
};

type QualSpec = {
  regex: RegExp;
  label: (match: RegExpExecArray) => string;
};

const DIPLOM_PROFESSION =
  "physiotherapeut(?:in)?|psycholog(?:e|in)|sozialpädagog(?:e|in)|sozialpaedagog(?:e|in)|biolog(?:e|in)|ingenieur(?:in)?|ökonom(?:in)?|oekonom(?:in)?|chemiker(?:in)?|pädagog(?:e|in)|paedagog(?:e|in)|soziolog(?:e|in)|betriebswirt(?:in)?|kaufmann|kauffrau";

const QUAL_SPECS: QualSpec[] = [
  {
    regex: new RegExp(`diplom(?:ierte[rsn]?)?[\\s-]+(${DIPLOM_PROFESSION})`, "giu"),
    label: (match) => `Diplom-${titleProfession(match[1] ?? match[0])}`,
  },
  {
    regex: /diplom[\s-]*ausbildung in ([^.\n]{8,70})/giu,
    label: (match) => `Diplom-Ausbildung in ${trimTail(match[1] ?? "")}`,
  },
  {
    regex: /(?:fach)?ärzt(?:in)? für naturheilkunde/giu,
    label: (match) => normalizeSpacing(match[0]),
  },
  {
    regex: /master of chiropractic|\bMChiro\b/giu,
    label: () => "Master of Chiropractic",
  },
  {
    regex: /amtsärztliche[rn]?\s+(?:überprüfung|prüfung)|amtsarztprüfung/giu,
    label: (match) => (/amtsarztprüfung/i.test(match[0]) ? "Amtsarztprüfung" : "Amtsärztliche Überprüfung"),
  },
  {
    regex: /\bEMDR[\s-]*(?:trauma[\s-]?)?therapeut(?:in)?/giu,
    label: (match) => normalizeSpacing(match[0]),
  },
  {
    regex: /\bNLP[\s-]*(?:master(?:[\s-]*practitioner)?|practitioner|therapeut(?:in)?)/giu,
    label: (match) => normalizeSpacing(match[0]),
  },
  {
    regex: /zertifizierte[rsn]?\s+BKiD[\s-]?kinderwunschberater(?:in)?|\bBKiD[\s-]?kinderwunschberater(?:in)?/giu,
    label: () => "BKiD-Kinderwunschberaterin",
  },
  {
    regex: /(?:staatlich anerkannte[rs]?|ausgebildete[rs]?)\s+physiotherapeut(?:in)?/giu,
    label: (match) => normalizeSpacing(match[0]),
  },
];

function matchRegExp(synonym: string): RegExp {
  const pattern = synonymPattern(synonym);
  return new RegExp(`(?<![${BOUNDARY_CLASS}])${pattern}(?![${BOUNDARY_CLASS}])`, "giu");
}

function windowAround(text: string, index: number, length: number, size: number): string {
  const start = Math.max(0, index - size);
  const end = Math.min(text.length, index + length + size);
  return text.slice(start, end);
}

function windowBefore(text: string, index: number, size: number): string {
  return text.slice(Math.max(0, index - size), index);
}

function snippetAt(text: string, index: number, length: number): string {
  return windowAround(text, index, length, SNIPPET_RADIUS).replace(/\s+/g, " ").trim();
}

function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[\s,;:.–-]+$/g, "").trim();
}

function trimTail(value: string): string {
  return normalizeSpacing(value)
    .replace(/\b(?:agtcm|fdh|bdh|vdh|vod|bao|vfp|shz)\b.*$/i, "")
    .replace(/\s+und\s*$/i, "")
    .trim();
}

function titleProfession(value: string): string {
  const cleaned = normalizeSpacing(value);
  if (!cleaned) return cleaned;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function clipLabel(label: string): string | undefined {
  const cleaned = canonicalizeQualification(label);
  if (cleaned.length < 3) return undefined;
  if (cleaned.length <= MAX_QUALIFICATION_LABEL_LENGTH) return cleaned;
  const clipped = cleaned.slice(0, MAX_QUALIFICATION_LABEL_LENGTH - 1).replace(/\s+\S*$/, "");
  return clipped.length >= 8 ? clipped : undefined;
}

function canonicalizeQualification(label: string): string {
  let value = normalizeSpacing(label).replace(/\s*-\s*/g, "-");
  value = value.replace(/\bNLP\s+(Master|Practitioner)/gi, "NLP-$1");
  value = value.replace(/\bEMDR-THERAPEUTIN\b/gi, "EMDR-Therapeutin");
  value = value.replace(/\bEMDR-Traumatherapeutin\b/gi, "EMDR-Traumatherapeutin");
  if (/^[A-ZÄÖÜ0-9-]+$/.test(value) && value.length > 4) {
    value = value
      .split("-")
      .map((part) => {
        if (part === "EMDR" || part === "NLP" || part === "BKID") return part === "BKID" ? "BKiD" : part;
        return part.charAt(0) + part.slice(1).toLowerCase();
      })
      .join("-");
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function flattenScrape(markdown: string): string {
  return stripMarkdownFormatting(markdown)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

export function isVerbandListing(name: string): boolean {
  return VERBAND_LISTING_RE.test(name);
}

function isBadAssociationContext(text: string, index: number, length: number): boolean {
  if (BAD_ASSOCIATION_BEFORE_RE.test(windowBefore(text, index, 24))) return true;
  return BAD_ASSOCIATION_AROUND_RE.test(windowAround(text, index, length, 140));
}

function precededByForbidden(text: string, index: number, prefixes: string[] | undefined): boolean {
  if (!prefixes?.length) return false;
  const before = windowBefore(text, index, 24).toLowerCase();
  return prefixes.some((prefix) => before.endsWith(prefix.toLowerCase()));
}

function isCertificateNotMembership(text: string, index: number, length: number): boolean {
  const after = text.slice(index + length, index + length + 18);
  if (!/^\s*zertifikat/i.test(after)) return false;
  return !/\bMitglied(?:schaft)?\b/i.test(windowBefore(text, index, 32));
}

function extractAssociations(
  text: string,
  associations: Association[],
  listingName?: string,
): AssociationMatch[] {
  if (listingName && isVerbandListing(listingName)) return [];

  const matches: AssociationMatch[] = [];
  const seen = new Set<string>();

  for (const association of associations) {
    if (matches.length >= MAX_ASSOCIATIONS_PER_ENTRY) break;
    const synonyms = [...association.synonyms].sort((a, b) => b.length - a.length);
    let found: AssociationMatch | undefined;

    for (const synonym of synonyms) {
      const regex = matchRegExp(synonym);
      for (const match of text.matchAll(regex)) {
        const index = match.index ?? 0;
        if (precededByForbidden(text, index, association.forbidIfPrecededBy)) continue;
        if (isBadAssociationContext(text, index, match[0].length)) continue;
        if (isCertificateNotMembership(text, index, match[0].length)) continue;
        const around = windowAround(text, index, match[0].length, CUE_WINDOW);
        if (!MEMBER_CUE_RE.test(around)) continue;
        found = {
          id: association.id,
          synonym,
          snippet: snippetAt(text, index, match[0].length),
        };
        break;
      }
      if (found) break;
    }

    if (found && !seen.has(found.id)) {
      seen.add(found.id);
      matches.push(found);
    }
  }

  return matches;
}

function extractQualifications(text: string, associationIds: string[]): QualificationMatch[] {
  const matches: QualificationMatch[] = [];
  const seen = new Set<string>();

  for (const spec of QUAL_SPECS) {
    if (matches.length >= MAX_QUALIFICATIONS_PER_ENTRY) break;
    const regex = new RegExp(spec.regex.source, spec.regex.flags.includes("g") ? spec.regex.flags : `${spec.regex.flags}g`);
    for (const match of text.matchAll(regex)) {
      if (matches.length >= MAX_QUALIFICATIONS_PER_ENTRY) break;
      const index = match.index ?? 0;
      const around = windowAround(text, index, match[0].length, CUE_WINDOW);
      if (BAD_QUALIFICATION_CONTEXT_RE.test(around)) continue;
      const label = clipLabel(spec.label(match));
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      if (associationIds.some((id) => key.includes(id))) continue;
      seen.add(key);
      matches.push({
        label,
        snippet: snippetAt(text, index, match[0].length),
      });
    }
  }

  return matches;
}

export function extractCredentials(
  markdown: string,
  associations: Association[],
  options: { listingName?: string } = {},
): CredentialExtraction {
  const text = flattenScrape(markdown);
  const associationMatches = extractAssociations(text, associations, options.listingName);
  const associationIds = associationMatches.map((match) => match.id);
  const qualificationMatches = extractQualifications(text, associationIds);

  return {
    associationIds,
    qualifications: qualificationMatches.map((match) => match.label),
    associationMatches,
    qualificationMatches,
  };
}

export function formatAssociationChip(association: Association): string {
  return association.abbreviation
    ? `Mitglied im ${association.abbreviation}`
    : `Mitglied: ${association.name}`;
}

function associationPhrase(association: Association): string {
  return association.abbreviation ?? association.name;
}

export function formatCredentialsLine(
  qualifications: string[],
  associations: Association[],
): string | undefined {
  const parts: string[] = [];
  if (qualifications.length > 0) {
    parts.push(qualifications.map((item) => item.replace(/\.$/, "")).join(". "));
  }
  if (associations.length === 1) {
    parts.push(`Mitglied im ${associationPhrase(associations[0]!)}`);
  } else if (associations.length === 2) {
    parts.push(
      `Mitglied im ${associationPhrase(associations[0]!)} und im ${associationPhrase(associations[1]!)}`,
    );
  } else if (associations.length > 2) {
    const last = associations.at(-1)!;
    const head = associations.slice(0, -1).map(associationPhrase).join(", ");
    parts.push(`Mitglied im ${head} und im ${associationPhrase(last)}`);
  }
  if (parts.length === 0) return undefined;
  const line = parts.join(". ").replace(/\.\./g, ".");
  return line.endsWith(".") ? line : `${line}.`;
}
