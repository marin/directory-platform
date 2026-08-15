export type ExtractedAbout = {
  paragraphs: string[];
  bioText: string;
  charCount: number;
};

const SKIP_LINE_RE =
  /^(home|startseite|kontakt|impressum|datenschutz|menü|menu|nach oben|zurück|weiter|cookie|login|english|deutsch|agb|newsletter)$/i;
const SKIP_PARAGRAPH_RE =
  /^(impressum|datenschutz|cookie|navigation|©|all rights reserved|we value your privacy|powered by)/i;
const LEGAL_PARAGRAPH_RE =
  /impressum|datenschutz|gesundheitsamt|heilpraktikergesetz|berufsordnung|zuständige behörde|amtsärztlich|berufständige regeln|validation purposes|left unchanged|für diese präsentation im sinne des geltenden rechts/i;
const BOOKING_ONLY_RE =
  /^(request a \d+|book a \d+|please book|termin vereinbaren|jetzt buchen)/i;
const COOKIE_OR_CONSENT_RE =
  /cookies?|cookieyes|cookie-richtlinie|cookie-einstellungen|consent categor|consent preference|customize consent|accept all|reject all|alle akzeptieren|we value your privacy|verwenden cookies|verwendet cookies|verwenden wir cookies|technologien wie cookies|diese webseite verwendet cookies|learn more about cookies|technische speicherung oder der (zugang|zugriff)|personenbezogenen daten von (dir|ihnen|you)|no cookies to display|necessary cookies are required|functional cookies help|analytical cookies|advertisement cookies|powered by cookie|einstellungen für die zustimmung|rechtmäßigen zweck|abonnenten oder (nutzer|benutzer)|freiwillige zustimmung deines internetdienstanbieters|akzeptieren\s*ablehnen|einstellungen speichern/i;

const COOKIE_CHROME_RE =
  /einstellungen für die zustimmung anpassen|customize consent preferences|reject all\s*accept all|alle ablehnen\s*alle akzeptieren|akzeptieren\s*ablehnen|akzeptierenablehnen|ablehnen\s*akzeptieren|einstellungen (ansehen|speichern)/gi;

export function isTemplateDescription(description: string): boolean {
  return /ist ein Heilpraktiker in Berlin mit Schwerpunkt/.test(description);
}

export function isCookieOrConsentText(text: string): boolean {
  return COOKIE_OR_CONSENT_RE.test(text);
}

export function isBoilerplateDescription(description: string): boolean {
  return isTemplateDescription(description) || isCookieOrConsentText(description);
}

const WEBSITE_POINTER_RE =
  /weitere informationen.{0,120}(website|webseite|homepage)|finden sie auf (ihrer|seiner|der) website|besuchen sie (bitte )?(die |ihre |seine )?(website|webseite)|auf ihrer website unter|mehr (infos|informationen) auf (der |ihrer )?(website|webseite)|kontaktformular auf der website|auf der website (der praxis |zur verfügung|zu finden|verfügbar)|informationen sind auf der website/i;

export function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1");
}

function isWebsitePointerSentence(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (!trimmed) return true;
  if (WEBSITE_POINTER_RE.test(trimmed)) return true;
  if (/^\(?https?:\/\//i.test(trimmed)) return true;
  return false;
}

export function sanitizeDirectoryText(text: string): string {
  return stripMarkdownFormatting(text)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !isWebsitePointerSentence(sentence))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isWebsiteOnlyFaq(item: { question: string; answer: string }): boolean {
  const question = item.question.toLowerCase();
  const answer = item.answer.toLowerCase();
  if (/website|webseite|homepage/.test(question) && /website|webseite|https?:\/\//.test(answer)) {
    return !/termin|öffnung|behandlung|leistung/.test(question);
  }
  return false;
}

const NAP_FAQ_RE =
  /wo (befindet|liegt|ist)( sich)? die (naturheil)?praxis|wie lautet die adresse|welche adresse|telefonnummer|wie (lautet|ist) (die |ihre )?telefon|wie kann ich .*(erreichen|anrufen|kontaktieren|buchen|vereinbaren)|welche (therapien|behandlungen|behandlungsangebote|leistungen|fachgebiete|preise)|öffnungszeiten|sprechzeiten|wann (hat|ist|sind) (die praxis |die sprech|geöffnet)|termin .{0,60}(buchen|vereinbaren)|wie (buche|vereinbare) ich einen termin|rückruf|telefonische beratung/i;

const TOPIC_FAQ_RE =
  /ersttermin|erstgespräch|anamnese|selbstzahler|gebü|krankenkasse|sprache|englisch|kinder|säugling|behandlungsdauer|wie lange dauert/i;

export function isNapFaqItem(item: { question: string; answer: string }): boolean {
  const question = item.question.trim();
  if (TOPIC_FAQ_RE.test(question)) return false;
  return NAP_FAQ_RE.test(question);
}

export function dropNapFaqItems(
  items: Array<{ question: string; answer: string }>,
): Array<{ question: string; answer: string }> {
  return items.filter((item) => !isNapFaqItem(item));
}

export function sanitizeFaqItems(
  items: Array<{ question: string; answer: string }>,
): Array<{ question: string; answer: string }> {
  return items
    .map((item) => ({
      question: stripMarkdownFormatting(item.question).trim(),
      answer: sanitizeDirectoryText(item.answer),
    }))
    .filter((item) => item.question.length > 0 && item.answer.length >= 20 && !isWebsiteOnlyFaq(item));
}

export function templateDescription(name: string, categories: string[]): string {
  const focus =
    categories[0] === "naturheilkunde" || !categories[0]
      ? "Naturheilkunde und ganzheitliche Behandlungen"
      : categories[0].replace(/-/g, " ");
  return `${name} ist ein Heilpraktiker in Berlin mit Schwerpunkt ${focus}. Kontakt, Adresse und Öffnungszeiten finden Sie in diesem Verzeichniseintrag.`;
}

export function stripCookieSentences(text: string): string {
  return text
    .replace(COOKIE_CHROME_RE, " ")
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !isCookieOrConsentText(sentence) && !/^mehr infos$/i.test(sentence.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function descriptionFromAbout(paragraphs: string[]): string | null {
  const usable = paragraphs
    .map(stripCookieSentences)
    .filter(
      (paragraph) =>
        paragraph.length > 0 &&
        !LEGAL_PARAGRAPH_RE.test(paragraph) &&
        !BOOKING_ONLY_RE.test(paragraph) &&
        !isCookieOrConsentText(paragraph) &&
        isSubstantiveParagraph(paragraph),
    );
  if (!usable.length) return null;

  const text = sanitizeDirectoryText(
    usable
      .slice(0, 2)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  );
  if (text.length < 80) return null;
  return text.length > 900 ? `${text.slice(0, 897)}…` : text;
}

function cleanLine(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSubstantiveParagraph(text: string): boolean {
  if (text.length < 40) return false;
  if (SKIP_PARAGRAPH_RE.test(text)) return false;
  if (LEGAL_PARAGRAPH_RE.test(text)) return false;
  if (isCookieOrConsentText(text)) return false;
  if (/casino|slot|einsatz|gewinn/i.test(text)) return false;
  if (/^\d+$/.test(text)) return false;
  return /[a-zäöüß]/i.test(text);
}

export function extractAboutFromMarkdown(markdown: string): ExtractedAbout {
  const paragraphs: string[] = [];
  const seen = new Set<string>();
  let buffer: string[] = [];

  function flushBuffer() {
    if (!buffer.length) return;
    const text = stripCookieSentences(cleanLine(buffer.join(" ")));
    buffer = [];
    if (!isSubstantiveParagraph(text)) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    paragraphs.push(text.slice(0, 1200));
  }

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushBuffer();
      continue;
    }

    if (line.startsWith("#")) {
      flushBuffer();
      const heading = cleanLine(line.replace(/^#+\s*/, ""));
      if (heading && !SKIP_LINE_RE.test(heading) && heading.length >= 3) {
        const key = heading.toLowerCase();
        if (!seen.has(key) && heading.length <= 120) {
          seen.add(key);
        }
      }
      continue;
    }

    if (/^[-*+]\s+/.test(line) || /^\|/.test(line)) {
      flushBuffer();
      continue;
    }

    const cleaned = cleanLine(line);
    if (!cleaned || SKIP_LINE_RE.test(cleaned) || isCookieOrConsentText(cleaned)) continue;
    buffer.push(cleaned);
  }

  flushBuffer();

  const bioText = paragraphs.join("\n\n").slice(0, 6000);
  return {
    paragraphs: paragraphs.slice(0, 12),
    bioText,
    charCount: bioText.length,
  };
}
