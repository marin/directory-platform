import siteConfig from "../../../config/site.config.ts";
import type { Dataset } from "../data/load-dataset.ts";
import { computeAggregateStats, computeCategoryStats, computeAreaStats, computeIndicationStats } from "../aggregates/compute.ts";
import { absoluteUrl, categoryPath, indicationPath, entryPath } from "../routing/paths.ts";
import { buildAggregateFactText } from "../seo/structured-data/builders.ts";

export function buildLlmsTxt(dataset: Dataset): string {
  const siteStats = computeAggregateStats(dataset.entries);
  const lines: string[] = [
    `# ${siteConfig.site.name}`,
    "",
    `> ${siteConfig.site.description}`,
    "",
    `Region: ${siteConfig.geography.locality}, ${siteConfig.geography.region}, ${siteConfig.geography.country}`,
    `Fachrichtung: ${siteConfig.directory.entryPlural}`,
    "",
    "## Statistiken",
    `- Aktive Einträge: ${siteStats.listingCount}`,
  ];
  if (siteStats.priceStats.median !== undefined) {
    lines.push(`- Medianpreis: ${siteStats.priceStats.median} ${siteConfig.directory.currency}`);
  }
  lines.push("", "## Kategorien");
  for (const cat of dataset.categories) {
    const stats = computeCategoryStats(dataset.entries, cat.id);
    if (stats.listingCount === 0) continue;
    lines.push(
      `- ${cat.name}: ${stats.listingCount} Einträge — ${absoluteUrl(categoryPath(cat.slug))}`,
    );
  }
  lines.push("", "## Beschwerden");
  for (const indication of dataset.indications) {
    const stats = computeIndicationStats(dataset.entries, indication.id);
    if (stats.listingCount === 0) continue;
    lines.push(
      `- ${indication.name}: ${stats.listingCount} Einträge — ${absoluteUrl(indicationPath(indication.slug))}`,
    );
  }
  return lines.join("\n");
}

export function buildLlmsFullTxt(dataset: Dataset): string {
  const base = buildLlmsTxt(dataset);
  const lines: string[] = [base, "", "## Einträge"];
  for (const entry of dataset.entries.filter((e) => e.isOpen)) {
    const cat = dataset.categories.find((c) => c.id === entry.categories[0]);
    const area = dataset.areas.find((a) => entry.areaIds?.includes(a.id));
    lines.push(
      `- ${entry.name} | ${cat?.name ?? ""} | ${area?.name ?? ""} | ${absoluteUrl(entryPath(entry.slug))}`,
    );
  }
  return lines.join("\n");
}

export function buildCategoryAggregateBlock(
  dataset: Dataset,
  categoryId: string,
): string {
  const cat = dataset.categories.find((c) => c.id === categoryId);
  if (!cat) return "";
  const stats = computeCategoryStats(dataset.entries, categoryId);
  return buildAggregateFactText(stats, cat.name);
}

export function buildAreaAggregateBlock(dataset: Dataset, areaId: string): string {
  const area = dataset.areas.find((a) => a.id === areaId);
  if (!area) return "";
  const stats = computeAreaStats(dataset.entries, areaId);
  return buildAggregateFactText(stats, area.name);
}
