#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import { offersFromExtracted } from "../../src/lib/data/offers-from-extracted.ts";
import { hasSubstantiveChange } from "../../src/lib/freshness/substantive-change.ts";
import { ROOT } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1]
  ?? (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

const SCRAPES_DIR = join(ROOT, "work/scrapes/firecrawl");
const ENTRIES_DIR = join(ROOT, "data/entries");
const today = new Date().toISOString().slice(0, 10);

function loadExtracted(slug) {
  const path = join(SCRAPES_DIR, slug, "prices-extracted.json");
  if (!existsSync(path)) return null;
  const data = JSON.parse(readFileSync(path, "utf-8"));
  if (!Array.isArray(data.offers) || data.offers.length === 0) return null;
  return data;
}

const slugs = slugArg
  ? [slugArg]
  : readdirSync(SCRAPES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((slug) => loadExtracted(slug));

let updated = 0;
let skipped = 0;
let missing = 0;
const report = [];

for (const slug of slugs) {
  const extracted = loadExtracted(slug);
  if (!extracted) continue;

  const entryPath = join(ENTRIES_DIR, `${slug}.json`);
  if (!existsSync(entryPath)) {
    missing += 1;
    report.push({ slug, status: "missing_entry", offers: extracted.offers.length });
    continue;
  }

  const current = entrySchema.parse(JSON.parse(readFileSync(entryPath, "utf-8")));
  const hasCurrentOffers = (current.offers ?? []).length > 0;
  if (hasCurrentOffers && !force) {
    skipped += 1;
    report.push({ slug, status: "skipped_has_offers", offers: extracted.offers.length });
    continue;
  }

  const offers = offersFromExtracted(extracted.offers);
  const proposed = {
    ...current,
    offers,
    lastUpdated: today,
  };
  const substantive = hasSubstantiveChange(current, proposed);
  const final = {
    ...proposed,
    lastUpdated: substantive ? today : current.lastUpdated,
  };

  entrySchema.parse(final);

  if (!dryRun) {
    writeFileSync(entryPath, JSON.stringify(final, null, 2) + "\n");
  }

  updated += 1;
  report.push({
    slug,
    status: dryRun ? "would_update" : "updated",
    offers: offers.length,
    priceUrl: extracted.priceUrl,
  });
}

const reportPath = join(ROOT, "work/scrapes/price-merge-report.json");
if (!dryRun) {
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        mergedAt: new Date().toISOString(),
        updated,
        skipped,
        missing,
        dryRun,
        force,
        entries: report,
      },
      null,
      2,
    ) + "\n",
  );
}

console.log(
  `${dryRun ? "Would update" : "Updated"} ${updated} entries` +
    (skipped ? `, skipped ${skipped} (already have offers; use --force)` : "") +
    (missing ? `, ${missing} missing entry files` : ""),
);
if (!dryRun) console.log(`Report: ${reportPath}`);

process.exit(missing > 0 ? 1 : 0);
