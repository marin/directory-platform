#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import { indicationsFileSchema } from "../../src/lib/validation/indication-schema.ts";
import {
  extractIndications,
  indicationIdsFromMatches,
} from "../../src/lib/data/extract-indications.ts";
import { hasSubstantiveChange } from "../../src/lib/freshness/substantive-change.ts";
import { ROOT, ensureWorkDir } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || !args.includes("--yes");
const slugArg =
  args.find((a) => a.startsWith("--slug="))?.split("=")[1] ??
  (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

if (!args.includes("--yes") && !args.includes("--dry-run")) {
  console.error("Usage: data:tag:indications -- --yes [--dry-run] [--slug <slug>]");
  process.exit(1);
}

const ENTRIES_DIR = join(ROOT, "data/entries");
const today = new Date().toISOString().slice(0, 10);
const indications = indicationsFileSchema.parse(
  JSON.parse(readFileSync(join(ROOT, "data/indications.json"), "utf-8")),
);

function sameIds(a = [], b = []) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const slugs = slugArg
  ? [slugArg]
  : readdirSync(ENTRIES_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""));

let updated = 0;
let skipped = 0;
let tagged = 0;
const report = [];
const counts = {};

for (const slug of slugs) {
  const entryPath = join(ENTRIES_DIR, `${slug}.json`);
  if (!existsSync(entryPath)) {
    skipped += 1;
    report.push({ slug, status: "missing_entry" });
    continue;
  }

  const current = entrySchema.parse(JSON.parse(readFileSync(entryPath, "utf-8")));
  const matches = extractIndications(current, indications);
  const indicationIds = indicationIdsFromMatches(matches);

  if (indicationIds.length > 0) tagged += 1;
  for (const id of indicationIds) {
    counts[id] = (counts[id] ?? 0) + 1;
  }

  if (sameIds(current.indicationIds ?? [], indicationIds)) {
    skipped += 1;
    report.push({
      slug,
      status: "skipped_unchanged",
      indicationIds,
      matches,
    });
    continue;
  }

  const proposed = {
    ...current,
    indicationIds,
    lastUpdated: today,
  };
  if (indicationIds.length === 0) {
    delete proposed.indicationIds;
  }

  const substantive = hasSubstantiveChange(current, proposed);
  const final = {
    ...proposed,
    lastUpdated: substantive ? today : current.lastUpdated,
  };
  if ((final.indicationIds ?? []).length === 0) {
    delete final.indicationIds;
  }

  entrySchema.parse({
    ...final,
    indicationIds: final.indicationIds ?? [],
  });

  if (!dryRun) {
    writeFileSync(entryPath, JSON.stringify(final, null, 2) + "\n");
  }

  updated += 1;
  report.push({
    slug,
    status: dryRun ? "would_update" : "updated",
    indicationIds,
    matches,
  });
}

const reportDir = ensureWorkDir("reports");
const reportPath = join(reportDir, "indication-tag-report.json");
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      taggedAt: new Date().toISOString(),
      dryRun,
      updated,
      skipped,
      tagged,
      counts,
      entries: report.filter((row) => row.indicationIds?.length),
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `${dryRun ? "Would update" : "Updated"} ${updated} entries` +
    `, ${tagged} tagged` +
    (skipped ? `, skipped ${skipped}` : ""),
);
console.log(`Counts: ${JSON.stringify(counts)}`);
console.log(`Report: ${reportPath}`);
