import siteConfig from "../../../config/site.config.ts";
import type { NormalizedEntry } from "./normalize-entry.ts";
import type { Area } from "../validation/area-schema.ts";
import type { Category } from "../validation/category-schema.ts";
import type { Association } from "../validation/association-schema.ts";
import { associationEntries, computeAssociationStats } from "../aggregates/compute.ts";
import { shouldIndexAssociation } from "./view-models/entry.ts";

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

export function associationShortName(association: Association): string {
  return association.abbreviation ?? association.name;
}

export function rankedAreasForAssociation(
  entries: NormalizedEntry[],
  associationId: string,
  areas: Area[],
  limit = 3,
): RankedRef[] {
  return rankedCounts(
    associationEntries(entries, associationId),
    (entry) => entry.areaIds ?? [],
    areas,
    limit,
  );
}

export function rankedCategoriesForAssociation(
  entries: NormalizedEntry[],
  associationId: string,
  categories: Category[],
  limit = 2,
): RankedRef[] {
  return rankedCounts(
    associationEntries(entries, associationId),
    (entry) => entry.categories,
    categories,
    limit,
  );
}

export function relatedAssociations(
  entries: NormalizedEntry[],
  associationId: string,
  associations: Association[],
  limit = 6,
): RankedRef[] {
  const tagged = associationEntries(entries, associationId);
  return rankedCounts(
    tagged,
    (entry) => (entry.associationIds ?? []).filter((id) => id !== associationId),
    associations.map((item) => ({
      id: item.id,
      name: item.abbreviation ?? item.name,
      slug: item.slug,
    })),
    limit,
  );
}

export function associationHubTitle(association: Association): string {
  const locality = siteConfig.geography.locality;
  const plural = siteConfig.directory.entryPlural;
  const short = associationShortName(association);
  if (association.kind === "zertifikat") {
    return `${plural} mit ${short}-Zertifikat in ${locality}`;
  }
  return `${plural} im ${short} in ${locality}`;
}

export function associationsIndexTitle(): string {
  return `${siteConfig.directory.entryPlural} nach Verband in ${siteConfig.geography.locality}`;
}

export function indexableAssociations(
  entries: NormalizedEntry[],
  associations: Association[],
): RankedRef[] {
  return associations
    .map((item) => ({
      id: item.id,
      name: item.abbreviation ? `${item.name} (${item.abbreviation})` : item.name,
      slug: item.slug,
      count: computeAssociationStats(entries, item.id).listingCount,
    }))
    .filter((item) => shouldIndexAssociation(item.count).index)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
}

export function taggedListingCountForAssociationHubs(
  entries: NormalizedEntry[],
  hubs: Array<{ id: string }>,
): number {
  const ids = new Set(hubs.map((hub) => hub.id));
  return entries.filter(
    (entry) =>
      entry.isOpen && (entry.associationIds ?? []).some((id) => ids.has(id)),
  ).length;
}

export function buildAssociationsIndexDescription(
  hubs: RankedRef[],
  taggedListingCount: number,
): string {
  const locality = siteConfig.geography.locality;
  const plural = siteConfig.directory.entryPlural;
  const hubCount = hubs.length;
  const hubLabel = hubCount === 1 ? "Verband" : "Verbände";
  const top = hubs.slice(0, 3).map((hub) => {
    const abbr = hub.name.match(/\(([^)]+)\)$/);
    return abbr ? abbr[1]! : hub.name;
  });
  if (top.length === 0) {
    return `${plural} in ${locality} nach Berufsverband finden.`;
  }
  return `${hubCount} ${hubLabel}, ${taggedListingCount} ${plural} in ${locality}. Am häufigsten ${joinGerman(top)}.`;
}

export function buildAssociationsIndexIntro(
  hubs: RankedRef[],
  taggedListingCount: number,
): string {
  const description = buildAssociationsIndexDescription(hubs, taggedListingCount);
  if (hubs.length === 0) return description;
  return `${description} Nur Praxen, deren Website die Mitgliedschaft nennt.`;
}

export function buildAssociationsIndexFaqs(
  hubs: RankedRef[],
  taggedListingCount: number,
): Array<{ question: string; answer: string }> {
  const locality = siteConfig.geography.locality;
  const plural = siteConfig.directory.entryPlural;
  const hubCount = hubs.length;
  const hubLabel = hubCount === 1 ? "Verband" : "Verbände";
  return [
    {
      question: `Welche Berufsverbände haben ${plural} in ${locality}?`,
      answer:
        hubCount === 0
          ? `Noch keine Verbände mit genug Praxen in ${locality}.`
          : `${hubCount} ${hubLabel} in diesem Verzeichnis: ${joinGerman(hubs.map((hub) => hub.name))}.`,
    },
    {
      question: `Wie kommt eine Praxis auf diese Seiten?`,
      answer: `Nur wenn die Praxissite die Mitgliedschaft oder das Zertifikat nennt. ${taggedListingCount} offene Praxen stehen auf mindestens einer Verbandsseite.`,
    },
    {
      question: `Ersetzt eine Verbandsmitgliedschaft den Arztbesuch?`,
      answer: `Nein. Die Seiten listen Praxen nach belegter Mitgliedschaft und stellen keine Diagnose.`,
    },
  ];
}

export function buildAssociationsIndexCopy(
  entries: NormalizedEntry[],
  associations: Association[],
): {
  hubs: RankedRef[];
  taggedListingCount: number;
  title: string;
  description: string;
  intro: string;
  faq: Array<{ question: string; answer: string }>;
} {
  const hubs = indexableAssociations(entries, associations);
  const taggedListingCount = taggedListingCountForAssociationHubs(entries, hubs);
  return {
    hubs,
    taggedListingCount,
    title: associationsIndexTitle(),
    description: buildAssociationsIndexDescription(hubs, taggedListingCount),
    intro: buildAssociationsIndexIntro(hubs, taggedListingCount),
    faq: buildAssociationsIndexFaqs(hubs, taggedListingCount),
  };
}

export function buildAssociationIntro(
  association: Association,
  listingCount: number,
  topAreas: RankedRef[],
  topCategories: RankedRef[],
): string {
  const locality = siteConfig.geography.locality;
  const plural = siteConfig.directory.entryPlural;
  const short = associationShortName(association);
  const variant = variantIndex(association.id, 3);
  const sentences: string[] = [association.description.replace(/\.$/, "") + "."];

  const countOpenings =
    association.kind === "zertifikat"
      ? [
          `${listingCount} ${plural} in ${locality} nennen ein ${short}-Zertifikat.`,
          `In ${locality} finden Sie ${listingCount} ${plural} mit ${short}-Zertifikat.`,
          `Es gibt ${listingCount} ${plural} in ${locality} mit ${short}-Zertifikat.`,
        ]
      : [
          `${listingCount} ${plural} in ${locality} nennen eine Mitgliedschaft im ${short}.`,
          `In ${locality} finden Sie ${listingCount} ${plural} im ${short}.`,
          `Es gibt ${listingCount} ${plural} in ${locality} mit belegter ${short}-Mitgliedschaft.`,
        ];
  sentences.push(countOpenings[variant]!);

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
    const methodSentences = [
      `Oft mit Schwerpunkt ${methods}.`,
      `Häufig ${methods}.`,
      `Daneben oft ${methods}.`,
    ];
    sentences.push(methodSentences[variant]!);
  }

  return sentences.join(" ");
}

export function buildAssociationFaqs(
  association: Association,
  listingCount: number,
  topAreas: RankedRef[],
  topCategories: RankedRef[],
): Array<{ question: string; answer: string }> {
  const locality = siteConfig.geography.locality;
  const plural = siteConfig.directory.entryPlural;
  const short = associationShortName(association);
  const label =
    association.kind === "zertifikat" ? `${short}-Zertifikat` : `Mitgliedschaft im ${short}`;
  const faq: Array<{ question: string; answer: string }> = [
    {
      question:
        association.kind === "zertifikat"
          ? `Was ist das ${short}-Zertifikat?`
          : `Was ist der ${short}?`,
      answer: association.description.replace(/\.$/, "") + ".",
    },
    {
      question: `Wie viele ${plural} in ${locality} haben eine ${label}?`,
      answer: `${listingCount} offene Praxen in ${locality}, deren Website das nennt.`,
    },
  ];

  if (topAreas.length > 0) {
    faq.push({
      question: `In welchen Bezirken liegen diese Praxen?`,
      answer: `Am häufigsten in ${joinGerman(topAreas.map((area) => `${area.name} (${area.count})`))}.`,
    });
  }

  if (topCategories.length > 0) {
    faq.push({
      question: `Welche Schwerpunkte haben diese Praxen?`,
      answer: `Oft ${joinGerman(topCategories.map((item) => item.name))}.`,
    });
  }

  faq.push({
    question: `Wie kommt eine Praxis auf diese Seite?`,
    answer: `Nur wenn die Praxissite die ${association.kind === "zertifikat" ? "Zertifizierung" : "Mitgliedschaft"} nennt. Das Verzeichnis prüft das nicht beim Verband nach.`,
  });

  return faq;
}

export function buildAssociationHubCopy(
  association: Association,
  entries: NormalizedEntry[],
  areas: Area[],
  categories: Category[],
): { intro: string; faq: Array<{ question: string; answer: string }> } {
  const listingCount = computeAssociationStats(entries, association.id).listingCount;
  const topAreas = rankedAreasForAssociation(entries, association.id, areas);
  const topCategories = rankedCategoriesForAssociation(entries, association.id, categories);
  return {
    intro: buildAssociationIntro(association, listingCount, topAreas, topCategories),
    faq: buildAssociationFaqs(association, listingCount, topAreas, topCategories),
  };
}
