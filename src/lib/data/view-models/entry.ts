import siteConfig from "../../../../config/site.config.ts";
import type { NormalizedEntry } from "../normalize-entry.ts";
import type { Category } from "../../validation/category-schema.ts";
import type { Area } from "../../validation/area-schema.ts";
import {
  computeCategoryStats,
  buildContextFact,
  formatPrice,
  type AggregateStats,
} from "../../aggregates/compute.ts";
import { entryPath, categoryPath, areaPath } from "../../routing/paths.ts";

export interface EntryCardViewModel {
  slug: string;
  name: string;
  description: string;
  href: string;
  primaryCategory: string;
  areaName: string | undefined;
  isOpen: boolean;
  lastUpdated: string;
  googleMapsRating?: number;
  googleMapsRatingsCount?: number;
  googleMapsUrl?: string;
}

export interface EntryViewModel {
  entry: NormalizedEntry;
  href: string;
  contextFact: string;
  category: Category | undefined;
  categories: Category[];
  areas: Area[];
  stats: AggregateStats;
  formattedOffers: Array<{
    name: string;
    price: string | undefined;
    duration: string | undefined;
    description: string | undefined;
  }>;
}

export function toEntryCardViewModel(
  entry: NormalizedEntry,
  categories: Category[],
  areas: Area[],
): EntryCardViewModel {
  const primaryCat = categories.find((c) => c.id === entry.categories[0]);
  const primaryArea = areas.find((a) => entry.areaIds?.includes(a.id));
  return {
    slug: entry.slug,
    name: entry.name,
    description: entry.description,
    href: entryPath(entry.slug),
    primaryCategory: primaryCat?.name ?? entry.categories[0] ?? "",
    areaName: primaryArea?.name,
    isOpen: entry.isOpen,
    lastUpdated: entry.lastUpdated,
    googleMapsRating: entry.googleMapsRating,
    googleMapsRatingsCount: entry.googleMapsRatingsCount,
    googleMapsUrl: entry.googleMapsUrl,
  };
}

export function toEntryViewModel(
  entry: NormalizedEntry,
  categories: Category[],
  areas: Area[],
  allEntries: NormalizedEntry[],
): EntryViewModel {
  const entryCategories = entry.categories
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => c !== undefined);
  const category = entryCategories[0];
  const entryAreas = areas.filter((a) => entry.areaIds?.includes(a.id));
  const stats = computeCategoryStats(allEntries, entry.categories[0] ?? "");
  const contextFact = category
    ? buildContextFact(entry, stats.listingCount, category.name)
    : `Listed in ${siteConfig.site.name}.`;

  return {
    entry,
    href: entryPath(entry.slug),
    contextFact,
    category,
    categories: entryCategories,
    areas: entryAreas,
    stats,
    formattedOffers: (entry.offers ?? []).map((offer) => ({
      name: offer.name,
      price: offer.priceLabel ?? formatPrice(offer.price),
      duration: offer.durationLabel ?? (offer.durationMinutes ? `${offer.durationMinutes} min` : undefined),
      description: offer.description,
    })),
  };
}

export function getRelatedEntries(
  entry: NormalizedEntry,
  allEntries: NormalizedEntry[],
  limit = 4,
): NormalizedEntry[] {
  return allEntries
    .filter(
      (e) =>
        e.isOpen &&
        e.slug !== entry.slug &&
        e.categories.some((c) => entry.categories.includes(c)),
    )
    .slice(0, limit);
}

export function shouldIndexCategory(
  openCount: number,
): { index: boolean; noindex: boolean } {
  const min = siteConfig.quality.minListingsForCategoryPage;
  return {
    index: openCount >= min,
    noindex: openCount > 0 && openCount < min,
  };
}

export function shouldIndexArea(openCount: number): { index: boolean; noindex: boolean } {
  const min = siteConfig.quality.minListingsForAreaPage;
  return {
    index: openCount >= min,
    noindex: openCount > 0 && openCount < min,
  };
}

export { categoryPath, areaPath, entryPath };
