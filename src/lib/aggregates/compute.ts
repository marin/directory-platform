import type { NormalizedEntry } from "../data/normalize-entry.ts";
import type { Offer } from "../validation/entry-schema.ts";
import siteConfig from "../../../config/site.config.ts";

export interface PriceStats {
  count: number;
  median: number | undefined;
  min: number | undefined;
  max: number | undefined;
}

export interface AggregateStats {
  listingCount: number;
  priceStats: PriceStats;
  openLateCount: number;
  openSundayCount: number;
  mostRecentUpdate: string | undefined;
  updatedLast90Days: number;
  offersByDuration: Map<number, PriceStats>;
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid];
}

function priceStatsFromOffers(offers: Offer[]): PriceStats {
  const prices = offers.map((o) => o.price).filter((p): p is number => typeof p === "number");
  return {
    count: prices.length,
    median: median(prices),
    min: prices.length > 0 ? Math.min(...prices) : undefined,
    max: prices.length > 0 ? Math.max(...prices) : undefined,
  };
}

function isOpenLate(entry: NormalizedEntry): boolean {
  return (entry.openingHours ?? []).some((h) => {
    const closeHour = parseInt(h.close.split(":")[0] ?? "0", 10);
    return closeHour >= 20 || h.close < h.open;
  });
}

function isOpenSunday(entry: NormalizedEntry): boolean {
  return (entry.openingHours ?? []).some((h) => h.day === "Sunday");
}

function daysSince(dateStr: string): number {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeAggregateStats(entries: NormalizedEntry[]): AggregateStats {
  const openEntries = entries.filter((e) => e.isOpen);
  const allOffers = openEntries.flatMap((e) => e.offers ?? []);
  const offersByDuration = new Map<number, PriceStats>();
  for (const offer of allOffers) {
    if (typeof offer.durationMinutes === "number" && typeof offer.price === "number") {
      const existing = offersByDuration.get(offer.durationMinutes);
      const prices = existing
        ? [existing.median, offer.price].filter((p): p is number => typeof p === "number")
        : [offer.price];
      offersByDuration.set(offer.durationMinutes, {
        count: (existing?.count ?? 0) + 1,
        median: median(prices),
        min: Math.min(existing?.min ?? offer.price, offer.price),
        max: Math.max(existing?.max ?? offer.price, offer.price),
      });
    }
  }

  const updates = openEntries.map((e) => e.lastUpdated).sort();
  return {
    listingCount: openEntries.length,
    priceStats: priceStatsFromOffers(allOffers),
    openLateCount: openEntries.filter(isOpenLate).length,
    openSundayCount: openEntries.filter(isOpenSunday).length,
    mostRecentUpdate: updates.at(-1),
    updatedLast90Days: openEntries.filter((e) => daysSince(e.lastUpdated) <= 90).length,
    offersByDuration,
  };
}

export function computeCategoryStats(
  entries: NormalizedEntry[],
  categoryId: string,
): AggregateStats {
  const filtered = entries.filter(
    (e) => e.isOpen && e.categories.includes(categoryId),
  );
  return computeAggregateStats(filtered);
}

export function computeAreaStats(entries: NormalizedEntry[], areaId: string): AggregateStats {
  const filtered = entries.filter(
    (e) => e.isOpen && (e.areaIds ?? []).includes(areaId),
  );
  return computeAggregateStats(filtered);
}

export function computeIndicationStats(
  entries: NormalizedEntry[],
  indicationId: string,
): AggregateStats {
  const filtered = entries.filter(
    (e) => e.isOpen && (e.indicationIds ?? []).includes(indicationId),
  );
  return computeAggregateStats(filtered);
}

export function indicationEntries(
  entries: NormalizedEntry[],
  indicationId: string,
): NormalizedEntry[] {
  return entries.filter(
    (e) => e.isOpen && (e.indicationIds ?? []).includes(indicationId),
  );
}

export function formatPrice(amount: number | undefined): string | undefined {
  if (amount === undefined) return undefined;
  return new Intl.NumberFormat(siteConfig.site.defaultLocale, {
    style: "currency",
    currency: siteConfig.directory.currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildContextFact(
  entry: NormalizedEntry,
  categoryCount: number,
  categoryName: string,
): string {
  return `Einer von ${categoryCount} ${siteConfig.directory.entryPlural}n in ${categoryName}.`;
}
