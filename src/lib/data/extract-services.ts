export type ExtractedService = {
  name: string;
  description?: string;
};

const SKIP_EXACT = new Set(
  [
    "home",
    "start",
    "startseite",
    "kontakt",
    "impressum",
    "datenschutz",
    "menü",
    "menu",
    "nach oben",
    "zurück",
    "weiter",
    "mehr erfahren",
    "jetzt buchen",
    "termin",
    "termine",
    "cookie",
    "cookies",
    "login",
    "english",
    "deutsch",
    "agb",
    "newsletter",
    "faq",
    "leistungen",
    "angebot",
    "therapien",
    "behandlungen",
    "schwerpunkte",
    "methoden",
    "verfahren",
    "portfolio",
    "blog",
    "news",
    "aktuelles",
    "über mich",
    "ueber mich",
    "about",
    "online-termine",
    "services",
    "service",
    "the practice",
    "die praxis",
    "die praxis:",
    "meine praxis",
    "praxis",
    "anfahrt",
    "adresse",
    "öffnungszeiten",
    "kosten",
    "preise",
    "book appointment",
    "book a appointment",
    "herzlich willkommen",
    "herzlich willkommen!",
    "willkommen",
    "cookie-richtlinie",
    "cookie-einstellungen",
    "cookie einstellungen",
    "datenschutz-präferenz",
    "datenschutzerklärung",
    "privacy overview",
    "externe inhalte",
    "dienste verwalten",
    "optionen verwalten",
    "nach oben scrollen",
    "links",
    "häufig gestellte fragen",
    "heilpraktikerin",
    "heilpraktiker",
    "kontaktformular",
    "telefonnummer",
    "verfügbarkeit",
    "akzeptierte versicherungen",
    "erfahrungen",
    "philosophie",
    "partner",
    "therapieangebote",
    "kursangebote",
    "anwendungsbereiche",
    "das bin ich",
    "wer ich bin",
    "wo du mich findest",
    "was andere über mich sagen",
    "hello and welcome",
    "hello and welcome,",
    "wir sagen danke",
    "wir sagen danke!",
    "der weg zu mir",
    "tragen sie sich gerne ein",
    "{title}",
    "ausführende therapeuten",
    "wie ich dir helfen kann",
    "wie ich arbeite",
    "mein weg",
    "mein angebot",
    "meine leistungen",
    "leistungen & kosten",
    "sicherheitsüberprüfung",
    "lese mehr über diese zwecke",
    "flur",
    "weiterlesen",
    "skip to content",
    "info & terminvereinbarung",
    "terminvereinbarung",
    "what my clients say",
    "agape formats & offerings",
    "therapy & coaching",
    "ceremonies & rituals",
    "circles & craft",
    "ganzheitliches behandlungsspektrum",
  ].map((name) => name.toLowerCase()),
);

const SKIP_PATTERN_RE =
  /cookie|cookieyes|datenschutz|privacy overview|vendor[_\\]*count|impressum|newsletter|nach oben|scrollen|flag-icons|therapieraum|behandlungsraum|eingangsbereich|wartezimmer|wartebereich|empfangsbereich|rezeption|kontaktformular|herzlich willkommen|book appointment|jetzt buchen|termin buchen|terminvereinbarung|nehmen sie kontakt|kontakt mit uns|externe inhalte|dienste verwalten|optionen verwalten|blog beitr|letzte blog|weiterlesen|skip to content|we value your privacy|gespannt, was es|zahlungsmodalit|tätigkeitsschwerpunkt|weiterbildungen und|wie ich arbeite|wie wir arbeiten|akzeptierte versicherung|\{title\}|handy:\s*\+|sagen danke|über mich sagen|wo du mich findest|das bin ich|wer ich bin|zustimmung anpassen|technische speicherung|tragen sie sich|clients say|formats?\s*&\s*offerings|behandlungsspektrum|fluss der lebensenergie/i;

const SKIP_PREFIX_RE =
  /^(hallo\b|hi!|herzlich\b|willkommen\b|welcome\b|moin\b|buche\b|bitte\b|nehmen sie\b|fragen sie\b|vereinbare\b|klick\b|über uns\b|about\b|info\s*&)/i;

const SECTION_BUCKET_RE =
  /^(therapy|therapie|coaching|ceremonies|rituals|circles|craft|mind|spirit|embodiment)(\s*[&/]\s*(therapy|therapie|coaching|ceremonies|rituals|circles|craft|mind|spirit|embodiment|behavior|emotions|energy|quantum|initiation|offerings|formats))+$/i;

const HEADING_RE = /^#{1,4}\s+(.+)$/;
const BULLET_RE = /^[-*+]\s+(.+)$/;
const LINK_ONLY_RE = /^\[([^\]]+)\]\([^)]+\)$/;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[…]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/[!.,:;]+$/g, "")
    .trim();
}

function looksLikeMarkdownJunk(name: string): boolean {
  return (
    /^!/.test(name) ||
    /!\[[^\]]*\]\(/.test(name) ||
    /\]\(https?:\/\//.test(name) ||
    /flag-icons/.test(name) ||
    /\{[^}]*vendor/.test(name)
  );
}

function looksLikeQuoteOrTestimonial(name: string): boolean {
  return (
    /^[„""«]/.test(name) ||
    /ich habe mich|ich bin mit|danke für diese|absolute empfehlung|gefühlt\.|komme gerne wieder/i.test(
      name,
    )
  );
}

const TREATMENT_HINT_RE =
  /akupunktur|osteopathie|homöopathie|therapie|massage|hypnose|heilkunde|coaching|kinesiologie|shiatsu|schröpfen|moxa|tuina|qigong|diagnostik|beratung|behandlung|somatic|trauma|reiki|ayurveda|yoga|cranio|chiro|phyto|medizin|tcm|naturheil|anamnese|heilprakt/i;

function looksLikeListingTitle(name: string, entryName?: string): boolean {
  if (/praxis für .{6,} in berlin/i.test(name)) return true;

  if (!entryName) return false;
  const n = normalizeName(name);
  const e = normalizeName(entryName);
  if (n.length < 8) return false;
  if (n === e) return true;
  if (e.startsWith(n) && n.split(" ").length >= 2) return true;
  if (n.includes(e) && e.length >= 10) return true;

  const afterDash = e.split(/\s[-–]\s/).slice(1).join(" ").trim();
  if (afterDash && n === afterDash) return true;

  if (/^(naturheilpraxis|heilpraxis)\b/.test(n) && e.includes(n)) return true;

  const first = (e.split(/\s[-–|:]\s/)[0] ?? "").trim();
  return n === first && n.split(" ").length >= 2;
}

function looksLikePersonName(name: string): boolean {
  if (TREATMENT_HINT_RE.test(name)) return false;
  const words = name.replace(/[.…!]/g, "").trim().split(/\s+/);
  if (words.length < 2 || words.length > 3) return false;
  return words.every((word) => /^[A-ZÄÖÜ][a-zäöüß'’-]+$/.test(word));
}

export function isUsableServiceName(name: string, entryName?: string): boolean {
  const cleaned = name.replace(/[…]+$/g, "").replace(/[:]+$/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length < 3 || cleaned.length > 80) return false;
  if (looksLikeMarkdownJunk(cleaned)) return false;
  if (/\?/.test(cleaned)) return false;
  if (looksLikeQuoteOrTestimonial(cleaned)) return false;
  if (cleaned.split(/\s+/).length > 9) return false;
  if ((cleaned.match(/\//g) ?? []).length >= 2) return false;
  if (/https?:\/\//i.test(cleaned)) return false;
  if (/\{[^}]+\}/.test(cleaned)) return false;
  if (/\+\d{2}\s*\d/.test(cleaned)) return false;
  if (/^\w[\w\s-]*\+\d{2,4}$/.test(cleaned)) return false;

  const key = normalizeName(cleaned);
  if (!key) return false;
  if (SKIP_EXACT.has(key)) return false;
  if (SKIP_PATTERN_RE.test(cleaned) || SKIP_PATTERN_RE.test(key)) return false;
  if (SKIP_PREFIX_RE.test(cleaned) || SKIP_PREFIX_RE.test(key)) return false;
  if (SECTION_BUCKET_RE.test(cleaned) || SECTION_BUCKET_RE.test(key)) return false;
  if (/casino|slot|einsatz|gewinn/i.test(cleaned)) return false;
  if (/^\d+$/.test(key)) return false;
  if (looksLikeListingTitle(cleaned, entryName)) return false;
  if (looksLikePersonName(cleaned)) return false;
  return true;
}

function cleanText(text: string): string {
  return text
    .replace(/\|/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(text: string, entryName?: string): string {
  const name = cleanText(text)
    .replace(/\s*[-–|:]\s*$/g, "")
    .replace(/[…]+$/g, "")
    .slice(0, 120);
  if (!isUsableServiceName(name, entryName)) return "";
  return name;
}

function descriptionFromBullet(
  text: string,
  entryName?: string,
): { name: string; description?: string } | null {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < 4) return null;

  const colon = cleaned.match(/^(.{3,80}?):\s+(.{8,})$/);
  if (colon) {
    const name = cleanName(colon[1]!, entryName);
    if (!name) return null;
    return { name, description: cleanText(colon[2]!).slice(0, 280) };
  }

  const dash = cleaned.match(/^(.{3,80}?)\s+[-–]\s+(.{8,})$/);
  if (dash) {
    const name = cleanName(dash[1]!, entryName);
    if (!name) return null;
    return { name, description: cleanText(dash[2]!).slice(0, 280) };
  }

  const name = cleanName(cleaned, entryName);
  if (!name) return null;
  if (name.length > 90) {
    return { name: name.slice(0, 90).trim(), description: cleaned.slice(90).trim().slice(0, 280) };
  }
  return { name };
}

export function extractServicesFromMarkdown(
  markdown: string,
  entryName?: string,
): ExtractedService[] {
  const services: ExtractedService[] = [];
  const seen = new Set<string>();

  function add(service: ExtractedService | null) {
    if (!service?.name) return;
    const key = service.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    services.push(service);
  }

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.match(HEADING_RE);
    if (heading) {
      add({ name: cleanName(heading[1]!, entryName) });
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      const text = bullet[1]!.replace(LINK_ONLY_RE, "$1");
      add(descriptionFromBullet(text, entryName));
    }
  }

  return services.slice(0, 40);
}
