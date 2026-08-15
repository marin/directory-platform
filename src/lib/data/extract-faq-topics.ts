import { isBoilerplateDescription, stripMarkdownFormatting } from "./extract-about.ts";
import { stripMarkdownForPrompt } from "./build-grounding-context.ts";
import type { Entry } from "../validation/entry-schema.ts";

export const FAQ_TOPIC_IDS = [
  "ersttermin",
  "dauer",
  "selbstzahler",
  "sprachen",
  "kinder",
] as const;

export type FaqTopicId = (typeof FAQ_TOPIC_IDS)[number];

export type FaqTopicEvidence = {
  topic: FaqTopicId;
  snippets: string[];
};

export type FaqTopicSource = {
  markdown?: string;
  description?: string;
  offers?: Array<
    Pick<NonNullable<Entry["offers"]>[number], "name" | "durationLabel" | "durationMinutes" | "description">
  >;
};

export const FAQ_TOPIC_QUESTIONS: Record<FaqTopicId, string> = {
  ersttermin: "Wie läuft der Ersttermin ab?",
  dauer: "Wie lange dauert eine Behandlung?",
  selbstzahler: "Übernimmt die Krankenkasse die Kosten?",
  sprachen: "Welche Sprachen werden in der Praxis gesprochen?",
  kinder: "Werden auch Kinder behandelt?",
};

const ERSTTERMIN_RE =
  /ersttermin|erstgespräch|erstgespraech|erste(?:n)?\s+(?:sitzung|behandlung|termin)|anamnese|aufnahmegespräch|aufnahmegespraech|was\s+(?:sie|du)\s+mitbringen|mitbringen\s+soll(?:en|st)?/i;

const DAUER_RE =
  /\d{1,3}\s*(?:-\s*\d{1,3}\s*)?(?:min|minuten|min\.)|behandlungsdauer|sitzungsdauer|(?:sitzung|behandlung)\s+dauert|dauert\s+(?:ca\.?|etwa|ungefähr|circa)?\s*\d|dauer\s+der\s+(?:sitzung|behandlung)|(?:eine|1)\s+stunde\s+(?:zeit|dauern|dauert)/i;

const SELBSTZAHLER_RE =
  /selbstzahler|privatrechnung|privatpatient|privatversichert|beihilfe|zusatzversicherung|gebüH\b|gebueh\b|gebührenordnung|gebuehrenordnung|gesetzliche(?:n)?\s+krankenkasse|nicht\s+(?:von\s+der\s+)?kasse|keine\s+(?:kassenleistung|gesetzliche)|erstattet?\s+(?:durch|von|über)|auf\s+wunsch\s+nach\s+der\s+gebühr/i;

const LANG =
  "englisch|english|französisch|francais|français|spanisch|spanish|español|italienisch|italiano|russisch|türkisch|tuerkisch|polnisch|arabisch";

const SPRACHEN_RE = new RegExp(
  `(?:behandlung|therapie|sitzung|anwendung(?:en)?|termin|gespräch|sprechstunde|consultation|treatment|praxis).{0,80}(?:${LANG})` +
    `|(?:${LANG}).{0,40}(?:speaking|sprachig|gesprochen|sprechen)` +
    `|sprech(?:e|en)\\s+(?:auch\\s+)?(?:deutsch\\s*(?:,|&|und)\\s*)?(?:${LANG})` +
    `|(?:auf|in)\\s+(?:deutsch\\s*(?:,|&|und)\\s*)?(?:${LANG})`,
  "i",
);

const KINDER_SPECIALTY_RE =
  /kinderosteopathie|kinder-osteopathie|kinderheilkunde|kindertherapie|s(?:ä|ae)uglingsosteopathie|kleinkindosteopathie/i;

const KINDER_AUDIENCE_RE =
  /(?:f(?:ü|ue|u)r|behandelt|behandlung(?:en)?|therapie|osteopathie|hom(?:ö|oe)opathie|praxis|spezialisiert(?:e|er|es)?)\s+(?:erwachsene(?:\s*(?:,|&|und)\s*)+)?(?:s(?:ä|ae)uglinge|kinder|babys)(?![a-zäöüß])|(?:s(?:ä|ae)uglinge|kinder|babys)(?![a-zäöüß])\s*(?:,|&|und)\s*(?:kinder\s*(?:,|&|und)\s*)?erwachsene|(?:behandle|behandelt)\s+s(?:ä|ae)uglinge/i;

const SNIPPET_RADIUS = 160;
const MAX_SNIPPETS = 3;
const MAX_SNIPPET_LEN = 320;
const MIN_SNIPPET_LEN = 24;

function collectSnippets(text: string, regex: RegExp): string[] {
  const snippets: string[] = [];
  const seen = new Set<string>();
  const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  let match = re.exec(text);
  while (match && snippets.length < MAX_SNIPPETS) {
    const start = Math.max(0, match.index - SNIPPET_RADIUS);
    const end = Math.min(text.length, match.index + match[0].length + SNIPPET_RADIUS);
    let snippet = stripMarkdownFormatting(text.slice(start, end)).replace(/\s+/g, " ").trim();
    snippet = snippet.replace(/^[^A-Za-zÄÖÜäöüß0-9]+/, "").replace(/[^A-Za-zÄÖÜäöüß0-9.!?…]+$/, "");
    if (snippet.length >= MIN_SNIPPET_LEN) {
      const key = snippet.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        snippets.push(snippet.slice(0, MAX_SNIPPET_LEN));
      }
    }
    match = re.exec(text);
  }
  return snippets;
}

function buildSourceText(input: FaqTopicSource): string {
  const parts: string[] = [];
  if (input.markdown?.trim()) {
    parts.push(stripMarkdownForPrompt(input.markdown, 30_000));
  }
  if (input.description && !isBoilerplateDescription(input.description)) {
    parts.push(input.description);
  }
  for (const offer of input.offers ?? []) {
    const bits = [offer.name, offer.durationLabel, offer.description].filter(Boolean);
    if (bits.length) parts.push(bits.join(". "));
  }
  return parts.join("\n\n");
}

function dauerSnippetsFromOffers(
  offers: FaqTopicSource["offers"],
): string[] {
  const snippets: string[] = [];
  for (const offer of offers ?? []) {
    if (offer.durationLabel) {
      snippets.push(`${offer.name}: ${offer.durationLabel}`);
    } else if (offer.durationMinutes) {
      snippets.push(`${offer.name}: ${offer.durationMinutes} Minuten`);
    }
    if (snippets.length >= MAX_SNIPPETS) break;
  }
  return snippets;
}

export function extractFaqTopics(input: FaqTopicSource): FaqTopicEvidence[] {
  const source = buildSourceText(input);
  const kinderSource = source.replace(/kinderwunsch/gi, " ");
  const topics: FaqTopicEvidence[] = [];

  const ersttermin = collectSnippets(source, ERSTTERMIN_RE);
  if (ersttermin.length) topics.push({ topic: "ersttermin", snippets: ersttermin });

  const dauer = [
    ...dauerSnippetsFromOffers(input.offers),
    ...collectSnippets(source, DAUER_RE),
  ].slice(0, MAX_SNIPPETS);
  if (dauer.length) topics.push({ topic: "dauer", snippets: [...new Set(dauer)] });

  const selbstzahler = collectSnippets(source, SELBSTZAHLER_RE);
  if (selbstzahler.length) topics.push({ topic: "selbstzahler", snippets: selbstzahler });

  const sprachen = collectSnippets(source, SPRACHEN_RE);
  if (sprachen.length) topics.push({ topic: "sprachen", snippets: sprachen });

  const kinder = [
    ...collectSnippets(kinderSource, KINDER_SPECIALTY_RE),
    ...collectSnippets(kinderSource, KINDER_AUDIENCE_RE),
  ].slice(0, MAX_SNIPPETS);
  if (kinder.length) topics.push({ topic: "kinder", snippets: [...new Set(kinder)] });

  return topics;
}

export function topicIdForFaqItem(item: { question: string; answer: string }): FaqTopicId | null {
  const text = `${item.question} ${item.answer}`.toLowerCase();
  if (/ersttermin|erstgespräch|anamnese|erste(?:n)?\s+(?:sitzung|termin|behandlung)|kennenlern/.test(text)) {
    return "ersttermin";
  }
  if (/selbstzahler|krankenkasse|privatrechnung|gebüh|gebueh|zusatzversicherung|privatversichert|beihilfe/.test(text)) {
    return "selbstzahler";
  }
  if (/sprache|englisch|französ|spanisch|italien|russisch|türkisch|polnisch|arabisch/.test(text)) {
    return "sprachen";
  }
  if (/(?:kinder|säugling|babys?)(?!wunsch)/.test(text)) {
    return "kinder";
  }
  if (/behandlungsdauer|wie lange dauert|\bminuten\b|\bminute\b|\bstunde\b/.test(text)) {
    return "dauer";
  }
  return null;
}

export function keepTopicFaqs(
  items: Array<{ question: string; answer: string }>,
  allowedTopics: FaqTopicId[],
): Array<{ question: string; answer: string }> {
  const allowed = new Set(allowedTopics);
  const seen = new Set<FaqTopicId>();
  const kept: Array<{ question: string; answer: string }> = [];
  for (const item of items) {
    const topic = topicIdForFaqItem(item);
    if (!topic || !allowed.has(topic) || seen.has(topic)) continue;
    seen.add(topic);
    kept.push(item);
  }
  return kept;
}

export function buildFixtureFaq(
  topics: FaqTopicEvidence[],
): Array<{ question: string; answer: string }> {
  return topics
    .map((topic) => {
      const answer = topic.snippets[0]?.replace(/\s+/g, " ").trim() ?? "";
      if (answer.length < 20) return null;
      return {
        question: FAQ_TOPIC_QUESTIONS[topic.topic],
        answer: answer.slice(0, 400),
      };
    })
    .filter((item): item is { question: string; answer: string } => item != null);
}
