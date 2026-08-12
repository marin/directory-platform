import siteConfig from "../../../config/site.config.ts";
import type { Dataset } from "../data/load-dataset.ts";
import { computeAggregateStats, computeCategoryStats, computeAreaStats } from "../aggregates/compute.ts";
import { absoluteUrl, categoryPath, entryPath } from "../routing/paths.ts";
import { buildAggregateFactText } from "../seo/structured-data/builders.ts";

export function buildLlmsTxt(dataset: Dataset): string {
  const siteStats = computeAggregateStats(dataset.entries);
  const lines: string[] = [
    `# ${siteConfig.site.name}`,
    "",
    `> ${siteConfig.site.description}`,
    "",
    `Geography: ${siteConfig.geography.locality}, ${siteConfig.geography.region}, ${siteConfig.geography.country}`,
    `Niche: ${siteConfig.directory.entryPlural}`,
    "",
    "## Site-wide statistics",
    `- Open listings: ${siteStats.listingCount}`,
  ];
  if (siteStats.priceStats.median !== undefined) {
    lines.push(`- Median price: $${siteStats.priceStats.median}`);
  }
  lines.push("", "## Categories");
  for (const cat of dataset.categories) {
    const stats = computeCategoryStats(dataset.entries, cat.id);
    if (stats.listingCount === 0) continue;
    lines.push(
      `- ${cat.name}: ${stats.listingCount} listings — ${absoluteUrl(categoryPath(cat.slug))}`,
    );
  }
  return lines.join("\n");
}

export function buildLlmsFullTxt(dataset: Dataset): string {
  const base = buildLlmsTxt(dataset);
  const lines: string[] = [base, "", "## Listings"];
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
