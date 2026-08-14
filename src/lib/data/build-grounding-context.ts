import type { Entry } from "../validation/entry-schema.ts";
import type { HomepageExtraction } from "./extract-homepage.ts";

export type GroundingManifest = {
  url?: string;
  metadata?: Record<string, unknown> | null;
};

export type GroundingContext = {
  name: string;
  categories: string[];
  areaIds: string[];
  address?: Entry["address"];
  phone?: string;
  email?: string;
  website?: string;
  bookingUrl?: string;
  openingHours: Entry["openingHours"];
  offers: Array<{
    name: string;
    price?: number;
    priceLabel?: string;
    durationLabel?: string;
    description?: string;
  }>;
  pageTitle?: string;
  websiteUrl?: string;
  websiteExcerpt: string;
};

const NAV_LINE_RE =
  /^\s*[-*]?\s*\[(home|de|en|startseite|menü|menu)\b/i;
const COOKIE_LINE_RE =
  /cookies?|cookieyes|consent categor|consent preference|accept all|reject all|alle akzeptieren|we value your privacy|verwenden cookies|verwendet cookies|technologien wie cookies|technische speicherung oder der zugang|no cookies to display|powered by cookie/i;

export function stripMarkdownForPrompt(markdown: string, maxChars = 6000): string {
  const lines = markdown.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (NAV_LINE_RE.test(trimmed)) return false;
    if (/nach oben scrollen/i.test(trimmed)) return false;
    if (COOKIE_LINE_RE.test(trimmed)) return false;
    return true;
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxChars);
}

export function buildGroundingContext(
  entry: Entry,
  options: {
    markdown: string;
    extracted?: HomepageExtraction | null;
    manifest?: GroundingManifest | null;
  },
): GroundingContext {
  const metadata = options.manifest?.metadata ?? {};
  const pageTitle =
    typeof metadata.title === "string"
      ? metadata.title
      : typeof metadata.ogTitle === "string"
        ? metadata.ogTitle
        : undefined;

  return {
    name: entry.name,
    categories: entry.categories,
    areaIds: entry.areaIds ?? [],
    address: entry.address,
    phone: entry.phone,
    email: entry.email,
    website: entry.website,
    bookingUrl: entry.bookingUrl ?? options.extracted?.bookingUrl,
    openingHours: entry.openingHours ?? [],
    offers: (entry.offers ?? []).slice(0, 20).map((offer) => ({
      name: offer.name,
      price: offer.price,
      priceLabel: offer.priceLabel,
      durationLabel: offer.durationLabel,
      description: offer.description,
    })),
    pageTitle,
    websiteUrl: options.manifest?.url ?? entry.website,
    websiteExcerpt: stripMarkdownForPrompt(options.markdown),
  };
}
