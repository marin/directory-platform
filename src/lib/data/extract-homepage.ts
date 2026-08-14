import {
  extractServicesFromMarkdown,
  isUsableServiceName,
  type ExtractedService,
} from "./extract-services.ts";

export type HomepageQualityFlags = {
  charCount: number;
  thin: boolean;
  spam: boolean;
};

export type HomepageExtraction = {
  images: string[];
  bookingUrl?: string;
  offers: ReturnType<typeof extractHomepageOffers>;
  flags: HomepageQualityFlags;
};

const THIN_PAGE_CHARS = 500;
const SPAM_RE = /casino|slot\s*machine|einsatz|gewinn|jackpot|poker\s*online|viagra|cialis/i;
const SKIP_IMAGE_RE =
  /favicon|\.ico(?:\?|$)|\/icon[-_/]|logo[-_]?(?:small|tiny|mini)|pixel|spacer|badge|1x1|gravatar|facebook\.com\/tr|google-analytics|doubleclick|\/flags\/|translatepress|wp-content\/plugins/i;
const BOOKING_TEXT_RE =
  /termin|kontakt|buchen|booking|appointment|anfrage|online-termine|jetzt buchen|zur kontakt|kontaktseite|doctolib|calendly|terminvereinbarung/i;
const BOOKING_PATH_RE =
  /\/(kontakt|contact|termin|booking|buchen|anfrage|appointment|online-termin)(?:\/|$|\?)/i;
const HOMEPAGE_OFFER_HEADING_RE = /^#{2,4}\s+(.+)$/;
const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^)]+)\)/g;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

function cleanHeading(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function extractHomepageOffers(markdown: string, entryName?: string): ExtractedService[] {
  const offers: ExtractedService[] = [];
  const seen = new Set<string>();

  for (const rawLine of markdown.split("\n")) {
    const match = rawLine.trim().match(HOMEPAGE_OFFER_HEADING_RE);
    if (!match) continue;
    const name = cleanHeading(match[1] ?? "");
    if (!isUsableServiceName(name, entryName)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    offers.push({ name });
  }

  if (offers.length > 0) return offers.slice(0, 20);
  return extractServicesFromMarkdown(markdown, entryName).slice(0, 20);
}

const METADATA_IMAGE_KEYS = [
  "og:image",
  "ogImage",
  "og:image:secure_url",
  "twitter:image",
] as const;

function normalizeUrl(url: string, baseUrl?: string): string | null {
  const trimmed = url.trim().replace(/^["']|["']$/g, "");
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("file:")) return null;
  try {
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    if (/^https?:\/\//i.test(trimmed)) return new URL(trimmed).toString();
    if (baseUrl) return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
  return null;
}

function isUsableImage(url: string): boolean {
  if (SKIP_IMAGE_RE.test(url)) return false;
  return /\.(jpe?g|png|webp|gif)(?:\?|$)/i.test(url) || /image\.jimcdn\.com|cloudinary|imgix|wp-content\/uploads/i.test(url);
}

function scoreImage(url: string): number {
  let score = 0;
  if (/dimension=\d+x10000|width=\d{3,}/i.test(url)) score += 2;
  if (/backgroundarea|banner|hero/i.test(url)) score += 1;
  if (/favicon|icon|logo/i.test(url)) score -= 5;
  if (/\.jpe?g|\.png|\.webp/i.test(url)) score += 1;
  return score;
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(url);
  }
  return result;
}

export function extractImagesFromHomepage(
  markdown: string,
  metadata?: Record<string, unknown> | null,
  baseUrl?: string,
): string[] {
  const candidates: string[] = [];

  for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    const url = normalizeUrl(match[1] ?? "", baseUrl);
    if (url && isUsableImage(url)) candidates.push(url);
  }

  if (metadata) {
    for (const key of METADATA_IMAGE_KEYS) {
      const value = metadata[key];
      if (typeof value === "string") {
        const url = normalizeUrl(value, baseUrl);
        if (url && isUsableImage(url)) candidates.push(url);
      }
    }
  }

  return uniqueUrls(candidates)
    .sort((a, b) => scoreImage(b) - scoreImage(a))
    .slice(0, 5);
}

export function extractBookingUrlFromHomepage(
  markdown: string,
  baseUrl?: string,
): string | undefined {
  const candidates: Array<{ url: string; score: number }> = [];

  for (const match of markdown.matchAll(MARKDOWN_LINK_RE)) {
    const text = match[1]?.trim() ?? "";
    const href = normalizeUrl(match[2] ?? "", baseUrl);
    if (!href) continue;

    let score = 0;
    if (BOOKING_TEXT_RE.test(text)) score += 3;
    if (BOOKING_PATH_RE.test(href)) score += 2;
    if (/doctolib|calendly|jameda/i.test(href)) score += 2;
    if (/impressum|datenschutz|agb|privacy/i.test(href)) score -= 5;
    if (score <= 0) continue;

    candidates.push({ url: href, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.url;
}

export function detectHomepageQuality(markdown: string): HomepageQualityFlags {
  const charCount = markdown.trim().length;
  return {
    charCount,
    thin: charCount < THIN_PAGE_CHARS,
    spam: SPAM_RE.test(markdown),
  };
}

export function extractHomepage(
  markdown: string,
  metadata?: Record<string, unknown> | null,
  baseUrl?: string,
  entryName?: string,
): HomepageExtraction {
  return {
    images: extractImagesFromHomepage(markdown, metadata, baseUrl),
    bookingUrl: extractBookingUrlFromHomepage(markdown, baseUrl),
    offers: extractHomepageOffers(markdown, entryName),
    flags: detectHomepageQuality(markdown),
  };
}
