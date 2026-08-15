import siteConfig from "../../../../config/site.config.ts";
import type { NormalizedEntry } from "../normalize-entry.ts";
import type { Category } from "../../validation/category-schema.ts";
import type { Area } from "../../validation/area-schema.ts";
import type { Indication } from "../../validation/indication-schema.ts";
import type { Association } from "../../validation/association-schema.ts";
import {
  computeCategoryStats,
  buildContextFact,
  formatPrice,
  type AggregateStats,
} from "../../aggregates/compute.ts";
import { entryPath, categoryPath, areaPath, indicationPath } from "../../routing/paths.ts";
import {
  entryImagePath,
  resolveCardImage,
  selectDisplayImages,
} from "../../media/entry-images.ts";
import {
  ENTRY_BADGE_META,
  extractEntryBadgeIds,
  type EntryBadgeId,
} from "../extract-badges.ts";
import { sortEntriesByRichness } from "../entry-richness.ts";
import { formatAssociationChip, formatCredentialsLine } from "../extract-credentials.ts";

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
  primaryImage?: string;
}

export interface EntryBadgeViewModel {
  id: EntryBadgeId;
  label: string;
  href?: string;
}

export interface RelatedEntriesResult {
  entries: NormalizedEntry[];
  title: string;
}

export interface EntryAssociationViewModel {
  id: string;
  label: string;
}

export interface EntryViewModel {
  entry: NormalizedEntry;
  href: string;
  contextFact: string;
  credentialsLine?: string;
  category: Category | undefined;
  categories: Category[];
  areas: Area[];
  indications: Indication[];
  associations: EntryAssociationViewModel[];
  badges: EntryBadgeViewModel[];
  stats: AggregateStats;
  images: string[];
  primaryImage?: string;
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
    primaryImage: resolveCardImage(entry.slug, entry.images ?? []),
  };
}

export function toEntryViewModel(
  entry: NormalizedEntry,
  categories: Category[],
  areas: Area[],
  allEntries: NormalizedEntry[],
  indications: Indication[] = [],
  associationTaxonomy: Association[] = [],
): EntryViewModel {
  const entryCategories = entry.categories
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => c !== undefined);
  const category = entryCategories[0];
  const entryAreas = areas.filter((a) => entry.areaIds?.includes(a.id));
  const entryIndications = indications.filter((item) =>
    (entry.indicationIds ?? []).includes(item.id),
  );
  const entryAssociations = associationTaxonomy.filter((item) =>
    (entry.associationIds ?? []).includes(item.id),
  );
  const stats = computeCategoryStats(allEntries, entry.categories[0] ?? "");
  const contextFact = category
    ? buildContextFact(entry, stats.listingCount, category.name)
    : `Listed in ${siteConfig.site.name}.`;
  const images = selectDisplayImages(entry.images ?? []);
  const primaryImage = images[0] ?? entryImagePath(entry.slug, 0);
  const psychotherapy = categories.find((item) => item.id === "psychotherapie");

  return {
    entry,
    href: entryPath(entry.slug),
    contextFact,
    credentialsLine: formatCredentialsLine(entry.qualifications ?? [], entryAssociations),
    category,
    categories: entryCategories,
    areas: entryAreas,
    indications: entryIndications,
    associations: entryAssociations.map((item) => ({
      id: item.id,
      label: formatAssociationChip(item),
    })),
    badges: extractEntryBadgeIds(entry).map((id) => ({
      ...ENTRY_BADGE_META[id],
      href: id === "hpp" && psychotherapy ? categoryPath(psychotherapy.slug) : undefined,
    })),
    stats,
    images,
    primaryImage: images.length > 0 ? primaryImage : undefined,
    formattedOffers: (entry.offers ?? []).map((offer) => ({
      name: offer.name,
      price: offer.priceLabel ?? formatPrice(offer.price),
      duration: offer.durationLabel ?? (offer.durationMinutes ? `${offer.durationMinutes} min` : undefined),
      description: offer.description,
    })),
  };
}

export function categoryOpenCounts(entries: NormalizedEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of entries) {
    if (!item.isOpen) continue;
    for (const id of item.categories) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

export function mostSpecificCategoryId(
  entry: Pick<NormalizedEntry, "categories">,
  counts: Map<string, number>,
): string | undefined {
  if (entry.categories.length === 0) return undefined;
  return [...entry.categories].sort((a, b) => {
    const diff = (counts.get(a) ?? 0) - (counts.get(b) ?? 0);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  })[0];
}

export function relatedCategoryId(
  entry: Pick<NormalizedEntry, "categories">,
  counts: Map<string, number>,
): string | undefined {
  const catchAll = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  const focused = catchAll
    ? entry.categories.filter((id) => id !== catchAll)
    : entry.categories;
  return mostSpecificCategoryId(
    { categories: focused.length > 0 ? focused : entry.categories },
    counts,
  );
}

export function relatedEntriesTitle(categoryName?: string, areaName?: string): string {
  const plural = siteConfig.directory.entryPlural;
  if (categoryName && areaName) {
    return `Weitere ${plural} für ${categoryName} in ${areaName}`;
  }
  if (areaName) return `Weitere ${plural} in ${areaName}`;
  if (categoryName) return `Weitere ${plural} für ${categoryName}`;
  return "Ähnliche Anbieter";
}

function sharesArea(
  entry: Pick<NormalizedEntry, "areaIds">,
  other: Pick<NormalizedEntry, "areaIds">,
): boolean {
  return (other.areaIds ?? []).some((id) => (entry.areaIds ?? []).includes(id));
}

export function getRelatedEntries(
  entry: NormalizedEntry,
  allEntries: NormalizedEntry[],
  categories: Category[],
  areas: Area[],
  limit = 4,
  indications: Indication[] = [],
): RelatedEntriesResult {
  const counts = categoryOpenCounts(allEntries);
  const specificId = relatedCategoryId(entry, counts);
  const categoryName = categories.find((item) => item.id === specificId)?.name;
  const areaName = areas.find((item) => (entry.areaIds ?? []).includes(item.id))?.name;
  const peers = allEntries.filter((item) => item.isOpen && item.slug !== entry.slug);

  const indicationCounts = new Map<string, number>();
  for (const item of allEntries) {
    if (!item.isOpen) continue;
    for (const id of item.indicationIds ?? []) {
      indicationCounts.set(id, (indicationCounts.get(id) ?? 0) + 1);
    }
  }
  const indicationId = [...(entry.indicationIds ?? [])].sort((a, b) => {
    const diff = (indicationCounts.get(a) ?? 0) - (indicationCounts.get(b) ?? 0);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  })[0];
  const indicationName = indications.find((item) => item.id === indicationId)?.name;
  const sameIndicationAndArea = indicationId
    ? peers.filter(
        (item) => (item.indicationIds ?? []).includes(indicationId) && sharesArea(entry, item),
      )
    : [];
  if (sameIndicationAndArea.length > 0) {
    return {
      entries: sortEntriesByRichness(sameIndicationAndArea).slice(0, limit),
      title: relatedEntriesTitle(indicationName, areaName),
    };
  }

  const sameAreaAndCategory = specificId
    ? peers.filter((item) => item.categories.includes(specificId) && sharesArea(entry, item))
    : [];
  if (sameAreaAndCategory.length > 0) {
    return {
      entries: sortEntriesByRichness(sameAreaAndCategory).slice(0, limit),
      title: relatedEntriesTitle(categoryName, areaName),
    };
  }

  const sameArea = peers.filter(
    (item) =>
      sharesArea(entry, item) && item.categories.some((id) => entry.categories.includes(id)),
  );
  if (sameArea.length > 0) {
    return {
      entries: sortEntriesByRichness(sameArea).slice(0, limit),
      title: relatedEntriesTitle(undefined, areaName),
    };
  }

  const sameCategory = specificId
    ? peers.filter((item) => item.categories.includes(specificId))
    : peers.filter((item) => item.categories.some((id) => entry.categories.includes(id)));
  return {
    entries: sortEntriesByRichness(sameCategory).slice(0, limit),
    title: relatedEntriesTitle(categoryName),
  };
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

export function shouldIndexIndication(
  openCount: number,
): { index: boolean; noindex: boolean } {
  const min = siteConfig.quality.minListingsForIndicationPage;
  return {
    index: openCount >= min,
    noindex: openCount > 0 && openCount < min,
  };
}

export { categoryPath, areaPath, entryPath, indicationPath };
