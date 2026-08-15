#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import { associationsFileSchema } from "../../src/lib/validation/association-schema.ts";
import { extractCredentials } from "../../src/lib/data/extract-credentials.ts";
import { hasSubstantiveChange } from "../../src/lib/freshness/substantive-change.ts";
import { ROOT, ensureWorkDir } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || !args.includes("--yes");
const slugArg =
  args.find((a) => a.startsWith("--slug="))?.split("=")[1] ??
  (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

if (!args.includes("--yes") && !args.includes("--dry-run")) {
  console.error("Usage: data:tag:credentials -- --yes [--dry-run] [--slug <slug>]");
  process.exit(1);
}

const ENTRIES_DIR = join(ROOT, "data/entries");
const SCRAPES_DIR = join(ROOT, "work/scrapes/firecrawl");
const today = new Date().toISOString().slice(0, 10);
const associations = associationsFileSchema.parse(
  JSON.parse(readFileSync(join(ROOT, "data/associations.json"), "utf-8")),
);

function sameList(a = [], b = []) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function loadScrapeMarkdown(slug) {
  const parts = [];
  for (const file of ["homepage.md", "about.md"]) {
    const path = join(SCRAPES_DIR, slug, file);
    if (existsSync(path)) parts.push(readFileSync(path, "utf-8"));
  }
  return parts.length ? parts.join("\n\n") : null;
}

function applyCredentials(entry, associationIds, qualifications) {
  const next = { ...entry };
  if (associationIds.length > 0) next.associationIds = associationIds;
  else delete next.associationIds;
  if (qualifications.length > 0) next.qualifications = qualifications;
  else delete next.qualifications;
  return next;
}

const slugs = slugArg
  ? [slugArg]
  : readdirSync(ENTRIES_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""));

let updated = 0;
let skipped = 0;
let tagged = 0;
let missingScrape = 0;
const report = [];
const associationCounts = {};
const qualificationCounts = {};

for (const slug of slugs) {
  const entryPath = join(ENTRIES_DIR, `${slug}.json`);
  if (!existsSync(entryPath)) {
    skipped += 1;
    report.push({ slug, status: "missing_entry" });
    continue;
  }

  const current = entrySchema.parse(JSON.parse(readFileSync(entryPath, "utf-8")));
  const markdown = loadScrapeMarkdown(slug);
  if (!markdown) {
    missingScrape += 1;
    skipped += 1;
    report.push({ slug, status: "missing_scrape" });
    continue;
  }

  const extracted = extractCredentials(markdown, associations, { listingName: current.name });
  const associationIds = extracted.associationIds;
  const qualifications = extracted.qualifications;

  if (associationIds.length > 0 || qualifications.length > 0) tagged += 1;
  for (const id of associationIds) {
    associationCounts[id] = (associationCounts[id] ?? 0) + 1;
  }
  for (const label of qualifications) {
    qualificationCounts[label] = (qualificationCounts[label] ?? 0) + 1;
  }

  if (
    sameList(current.associationIds ?? [], associationIds) &&
    sameList(current.qualifications ?? [], qualifications)
  ) {
    skipped += 1;
    report.push({
      slug,
      status: "skipped_unchanged",
      associationIds,
      qualifications,
    });
    continue;
  }

  const proposed = applyCredentials(
    { ...current, lastUpdated: today },
    associationIds,
    qualifications,
  );
  const substantive = hasSubstantiveChange(current, proposed);
  const final = {
    ...proposed,
    lastUpdated: substantive ? today : current.lastUpdated,
  };

  entrySchema.parse({
    ...final,
    associationIds: final.associationIds ?? [],
    qualifications: final.qualifications ?? [],
  });

  if (!dryRun) {
    writeFileSync(entryPath, JSON.stringify(final, null, 2) + "\n");
  }

  updated += 1;
  report.push({
    slug,
    status: dryRun ? "would_update" : "updated",
    associationIds,
    qualifications,
    associationMatches: extracted.associationMatches,
    qualificationMatches: extracted.qualificationMatches,
  });
}

const reportDir = ensureWorkDir("scrapes");
const reportPath = join(reportDir, "credentials-tag-report.json");
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      taggedAt: new Date().toISOString(),
      dryRun,
      updated,
      skipped,
      tagged,
      missingScrape,
      associationCounts,
      qualificationCounts,
      entries: report.filter(
        (row) => (row.associationIds?.length ?? 0) > 0 || (row.qualifications?.length ?? 0) > 0,
      ),
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `${dryRun ? "Would update" : "Updated"} ${updated} entries` +
    `, ${tagged} tagged` +
    (skipped ? `, skipped ${skipped}` : "") +
    (missingScrape ? `, ${missingScrape} without scrape` : ""),
);
console.log(`Associations: ${JSON.stringify(associationCounts)}`);
console.log(`Qualifications: ${JSON.stringify(qualificationCounts)}`);
console.log(`Report: ${reportPath}`);
