import type { NormalizedEntry } from "./normalize-entry.ts";
import type { Entry } from "../validation/entry-schema.ts";
import { isBoilerplateDescription, sanitizeFaqItems } from "./extract-about.ts";
import { entryImageDir, entryImagePath } from "../media/entry-images.ts";

export type RichnessTier = "A" | "B" | "C" | "D";

export interface EntryRichnessBreakdown {
  description: number;
  faq: number;
  offers: number;
  images: number;
  bookingUrl: number;
  indications: number;
  total: number;
  tier: RichnessTier;
}

export function isBrokenBookingUrl(url: string | undefined): boolean {
  if (!url?.trim()) return true;
  if (/\s/.test(url)) return true;
  if (/%20%22|%22/i.test(url)) return true;
  return false;
}

export function hasLocalHeroImage(slug: string, images: string[]): boolean {
  const heroPath = entryImagePath(slug, 0);
  const localDir = entryImageDir(slug);
  return images.some((image) => image === heroPath || image.startsWith(`${localDir}/`));
}

function scoreDescription(description: string): number {
  if (isBoilerplateDescription(description)) return 0;
  let score = 20;
  if (description.length >= 200) score += 10;
  return score;
}

function scoreFaq(faq: Entry["faq"]): number {
  const valid = sanitizeFaqItems(faq ?? []);
  return Math.min(valid.length * 5, 20);
}

function scoreOffers(offers: Entry["offers"]): number {
  const list = offers ?? [];
  let score = Math.min(list.length * 4, 12);
  if (list.some((offer) => offer.price != null || offer.priceLabel)) score += 4;
  if (list.some((offer) => offer.description?.trim())) score += 4;
  return Math.min(score, 20);
}

function scoreImages(slug: string, images: string[]): number {
  const list = images ?? [];
  let score = Math.min(list.length * 5, 10);
  if (hasLocalHeroImage(slug, list)) score += 5;
  return Math.min(score, 15);
}

function scoreBookingUrl(bookingUrl: string | undefined): number {
  if (isBrokenBookingUrl(bookingUrl)) return 0;
  return 5;
}

function scoreIndications(indicationIds: string[] | undefined): number {
  return Math.min((indicationIds ?? []).length * 2, 8);
}

function tierFromScore(score: number): RichnessTier {
  if (score >= 60) return "A";
  if (score >= 30) return "B";
  if (score >= 10) return "C";
  return "D";
}

type RichnessEntry = Pick<
  NormalizedEntry,
  "slug" | "description" | "faq" | "offers" | "images" | "bookingUrl" | "indicationIds"
>;

export function computeEntryRichness(entry: RichnessEntry): EntryRichnessBreakdown {
  const description = scoreDescription(entry.description);
  const faq = scoreFaq(entry.faq);
  const offers = scoreOffers(entry.offers);
  const images = scoreImages(entry.slug, entry.images ?? []);
  const bookingUrl = scoreBookingUrl(entry.bookingUrl);
  const indications = scoreIndications(entry.indicationIds);
  const total = description + faq + offers + images + bookingUrl + indications;

  return {
    description,
    faq,
    offers,
    images,
    bookingUrl,
    indications,
    total,
    tier: tierFromScore(total),
  };
}

export function sortEntriesByRichness(entries: NormalizedEntry[]): NormalizedEntry[] {
  return [...entries].sort((a, b) => {
    const scoreA = computeEntryRichness(a).total;
    const scoreB = computeEntryRichness(b).total;
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (b.lastUpdated !== a.lastUpdated) return b.lastUpdated.localeCompare(a.lastUpdated);
    return a.name.localeCompare(b.name, "de");
  });
}
