#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import { computeEntryRichness } from "../../src/lib/data/entry-richness.ts";
import { ROOT, ensureWorkDir } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);

function readArg(name) {
  const eq = args.find((arg) => arg.startsWith(`--${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return undefined;
}

const tierFilter = readArg("tier");
const categoryFilter = readArg("category");
const areaFilter = readArg("area");
const topN = Number(readArg("top") ?? 20);

const dataset = loadDataset();

let entries = dataset.entries.filter((entry) => entry.isOpen);

if (categoryFilter) {
  entries = entries.filter((entry) => entry.categories.includes(categoryFilter));
}

if (areaFilter) {
  entries = entries.filter((entry) => (entry.areaIds ?? []).includes(areaFilter));
}

const rows = entries.map((entry) => {
  const richness = computeEntryRichness(entry);
  return {
    slug: entry.slug,
    name: entry.name,
    categories: entry.categories,
    areaIds: entry.areaIds ?? [],
    lastUpdated: entry.lastUpdated,
    ...richness,
  };
});

if (tierFilter) {
  const filtered = rows.filter((row) => row.tier === tierFilter.toUpperCase());
  rows.length = 0;
  rows.push(...filtered);
}

rows.sort((a, b) => {
  if (b.total !== a.total) return b.total - a.total;
  return b.lastUpdated.localeCompare(a.lastUpdated);
});

const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
for (const row of rows) {
  tierCounts[row.tier] += 1;
}

const categoryAggregation = Object.fromEntries(
  dataset.categories.map((category) => {
    const categoryRows = rows.filter((row) => row.categories.includes(category.id));
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    for (const row of categoryRows) counts[row.tier] += 1;
    return [category.id, { total: categoryRows.length, tiers: counts }];
  }),
);

const areaAggregation = Object.fromEntries(
  dataset.areas.map((area) => {
    const areaRows = rows.filter((row) => row.areaIds.includes(area.id));
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    for (const row of areaRows) counts[row.tier] += 1;
    return [area.id, { total: areaRows.length, tiers: counts }];
  }),
);

const report = {
  generatedAt: new Date().toISOString(),
  filters: {
    tier: tierFilter ?? null,
    category: categoryFilter ?? null,
    area: areaFilter ?? null,
  },
  summary: {
    total: rows.length,
    tiers: tierCounts,
  },
  categoryAggregation,
  areaAggregation,
  entries: rows,
};

const reportsDir = ensureWorkDir("reports");
const jsonPath = `${reportsDir}/enrichment-audit.json`;
writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

const csvHeader =
  "slug,name,tier,total,description,faq,offers,images,bookingUrl,lastUpdated,categories,areaIds";
const csvLines = rows.map((row) =>
  [
    row.slug,
    `"${row.name.replace(/"/g, '""')}"`,
    row.tier,
    row.total,
    row.description,
    row.faq,
    row.offers,
    row.images,
    row.bookingUrl,
    row.lastUpdated,
    row.categories.join("|"),
    row.areaIds.join("|"),
  ].join(","),
);
const csvPath = `${reportsDir}/enrichment-audit.csv`;
writeFileSync(csvPath, [csvHeader, ...csvLines].join("\n") + "\n");

console.log(`Enrichment audit (${rows.length} open entries)`);
console.log(`Tier distribution: A=${tierCounts.A} B=${tierCounts.B} C=${tierCounts.C} D=${tierCounts.D}`);
console.log(`Reports: ${jsonPath.replace(ROOT, ".")}, ${csvPath.replace(ROOT, ".")}`);
console.log(`\nTop ${topN}:`);
for (const row of rows.slice(0, topN)) {
  console.log(`  ${row.tier} ${row.total} — ${row.slug}`);
}
console.log(`\nBottom ${topN}:`);
for (const row of rows.slice(-topN).reverse()) {
  console.log(`  ${row.tier} ${row.total} — ${row.slug}`);
}
