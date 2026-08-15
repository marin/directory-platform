import siteConfig from "../../../config/site.config.ts";
import type { NormalizedEntry } from "./normalize-entry.ts";
import type { Area } from "../validation/area-schema.ts";
import type { Category } from "../validation/category-schema.ts";
import type { Indication } from "../validation/indication-schema.ts";
import { computeIndicationStats, indicationEntries } from "../aggregates/compute.ts";

export interface RankedRef {
  id: string;
  name: string;
  slug: string;
  count: number;
}

function joinGerman(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} und ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} und ${names.at(-1)}`;
}

function variantIndex(id: string, modulo: number): number {
  let hash = 0;
  for (const char of id) hash += char.charCodeAt(0);
  return hash % modulo;
}

function rankedCounts(
  entries: NormalizedEntry[],
  idsOf: (entry: NormalizedEntry) => string[],
  catalog: Array<{ id: string; name: string; slug: string }>,
  limit: number,
): RankedRef[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const id of idsOf(entry)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return catalog
    .map((item) => ({ ...item, count: counts.get(item.id) ?? 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"))
    .slice(0, limit);
}

export function rankedAreasForIndication(
  entries: NormalizedEntry[],
  indicationId: string,
  areas: Area[],
  limit = 3,
): RankedRef[] {
  return rankedCounts(
    indicationEntries(entries, indicationId),
    (entry) => entry.areaIds ?? [],
    areas,
    limit,
  );
}

export function rankedCategoriesForIndication(
  entries: NormalizedEntry[],
  indicationId: string,
  categories: Category[],
  limit = 2,
): RankedRef[] {
  return rankedCounts(
    indicationEntries(entries, indicationId),
    (entry) => entry.categories,
    categories,
    limit,
  );
}

export function relatedIndications(
  entries: NormalizedEntry[],
  indicationId: string,
  indications: Indication[],
  limit = 6,
): RankedRef[] {
  const tagged = indicationEntries(entries, indicationId);
  return rankedCounts(
    tagged,
    (entry) => (entry.indicationIds ?? []).filter((id) => id !== indicationId),
    indications,
    limit,
  );
}

export function indicationHubTitle(indicationName: string): string {
  return `${siteConfig.directory.entryPlural} für ${indicationName} in ${siteConfig.geography.locality}`;
}

function containsNameAsWord(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "iu").test(text);
}

function scopeClause(indication: Indication): string | undefined {
  const raw = indication.description?.replace(/\.$/, "").trim() ?? "";
  if (!raw) return undefined;
  const name = indication.name.trim();
  const nameParts = name
    .split(/\s*&\s*|\s+und\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const leftover = raw
    .split(/\s*,\s*|\s+und\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const lower = part.toLowerCase();
      if (lower === name.toLowerCase()) return false;
      return !nameParts.some((item) => lower === item.toLowerCase());
    });
  if (leftover.length === 0) return undefined;
  const scope = leftover.length === 1 ? leftover[0]! : joinGerman(leftover);
  if (scope.toLowerCase() === name.toLowerCase()) return undefined;
  if (containsNameAsWord(scope, name)) return undefined;
  if (/^(naturheilkundliche |ganzheitliche )?(begleitung|behandlung|unterstützung)\b/i.test(scope)) {
    return undefined;
  }
  return scope;
}

export function buildIndicationIntro(
  indication: Indication,
  listingCount: number,
  topAreas: RankedRef[],
  topCategories: RankedRef[],
): string {
  const locality = siteConfig.geography.locality;
  const plural = siteConfig.directory.entryPlural;
  const scope = scopeClause(indication);
  const name = indication.name;
  const variant = variantIndex(indication.id, 3);
  const sentences: string[] = [];

  if (scope) {
    const openings = [
      `${listingCount} ${plural} in ${locality} behandeln ${name}, etwa ${scope}.`,
      `In ${locality} finden Sie ${listingCount} ${plural} für ${name} – ${scope}.`,
      `Es gibt ${listingCount} ${plural} in ${locality} für ${name}: ${scope}.`,
    ];
    sentences.push(openings[variant]!);
  } else {
    const openings = [
      `${listingCount} ${plural} in ${locality} behandeln ${name}.`,
      `In ${locality} finden Sie ${listingCount} ${plural} für ${name}.`,
      `Es gibt ${listingCount} ${plural} in ${locality} für ${name}.`,
    ];
    sentences.push(openings[variant]!);
  }

  if (topAreas.length > 0) {
    const areas = joinGerman(topAreas.map((area) => area.name));
    const areaSentences = [
      `Die meisten Praxen liegen in ${areas}.`,
      `Am häufigsten in ${areas}.`,
      `Vor allem in ${areas}.`,
    ];
    sentences.push(areaSentences[variant]!);
  }

  if (topCategories.length > 0) {
    const methods = joinGerman(topCategories.map((item) => item.name));
    const methodPhrase =
      topCategories.length === 1 ? `Schwerpunkt ${methods}` : `Schwerpunkten ${methods}`;
    const methodSentences = [
      `Oft in Kombination mit ${methods}.`,
      `Häufig mit ${methodPhrase}.`,
      `Daneben oft ${methods}.`,
    ];
    sentences.push(methodSentences[variant]!);
  }

  return sentences.join(" ");
}

export function buildIndicationFaqs(
  indication: Indication,
  listingCount: number,
  topAreas: RankedRef[],
  topCategories: RankedRef[],
): Array<{ question: string; answer: string }> {
  const locality = siteConfig.geography.locality;
  const plural = siteConfig.directory.entryPlural;
  const name = indication.name;
  const faq: Array<{ question: string; answer: string }> = [
    {
      question: `Wie viele ${plural} behandeln ${name} in ${locality}?`,
      answer: `${listingCount} offene Praxen in ${locality}.`,
    },
  ];

  if (topAreas.length > 0) {
    faq.push({
      question: `In welchen Bezirken liegen Praxen für ${name}?`,
      answer: `Am häufigsten in ${joinGerman(topAreas.map((area) => `${area.name} (${area.count})`))}.`,
    });
  }

  if (topCategories.length > 0) {
    faq.push({
      question: `Welche Schwerpunkte haben diese Praxen?`,
      answer: `Oft ${joinGerman(topCategories.map((item) => item.name))}.`,
    });
  }

  return faq;
}

export function buildIndicationHubCopy(
  indication: Indication,
  entries: NormalizedEntry[],
  areas: Area[],
  categories: Category[],
): { intro: string; faq: Array<{ question: string; answer: string }> } {
  const listingCount = computeIndicationStats(entries, indication.id).listingCount;
  const topAreas = rankedAreasForIndication(entries, indication.id, areas);
  const topCategories = rankedCategoriesForIndication(entries, indication.id, categories);
  return {
    intro: buildIndicationIntro(indication, listingCount, topAreas, topCategories),
    faq: buildIndicationFaqs(indication, listingCount, topAreas, topCategories),
  };
}
