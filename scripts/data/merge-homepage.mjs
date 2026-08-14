#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import { mergeServiceOffers } from "../../src/lib/data/offers-from-extracted.ts";
import { hasSubstantiveChange } from "../../src/lib/freshness/substantive-change.ts";
import { ROOT } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1]
  ?? (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

const SCRAPES_DIR = join(ROOT, "work/scrapes/firecrawl");
const ENTRIES_DIR = join(ROOT, "data/entries");
const today = new Date().toISOString().slice(0, 10);

function loadExtracted(slug) {
  const path = join(SCRAPES_DIR, slug, "homepage-extracted.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function mergeImages(current, extracted) {
  if ((extracted ?? []).length > 0) return extracted.slice(0, 5);
  return current ?? [];
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
  if (extracted.flags?.spam) {
    skipped += 1;
    report.push({ slug, status: "skipped_spam" });
    continue;
  }

  const entryPath = join(ENTRIES_DIR, `${slug}.json`);
  if (!existsSync(entryPath)) {
    missing += 1;
    report.push({ slug, status: "missing_entry" });
    continue;
  }

  const current = entrySchema.parse(JSON.parse(readFileSync(entryPath, "utf-8")));
  const images = mergeImages(current.images, extracted.images);
  const bookingUrl = current.bookingUrl ?? extracted.bookingUrl;
  const offers = mergeServiceOffers(current.offers ?? [], extracted.offers ?? [], current.name);

  const changed =
    JSON.stringify(current.images ?? []) !== JSON.stringify(images) ||
    current.bookingUrl !== bookingUrl ||
    JSON.stringify(current.offers ?? []) !== JSON.stringify(offers);

  if (!changed) {
    skipped += 1;
    report.push({ slug, status: "skipped_no_changes" });
    continue;
  }

  const proposed = {
    ...current,
    images,
    bookingUrl,
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
    imagesAdded: images.length - (current.images ?? []).length,
    offersAdded: offers.length - (current.offers ?? []).length,
    bookingUrlAdded: !current.bookingUrl && Boolean(extracted.bookingUrl),
    thin: extracted.flags?.thin ?? false,
  });
}

const reportPath = join(ROOT, "work/scrapes/homepage-merge-report.json");
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
        entries: report,
      },
      null,
      2,
    ) + "\n",
  );
}

console.log(
  `${dryRun ? "Would update" : "Updated"} ${updated} entries` +
    (skipped ? `, skipped ${skipped}` : "") +
    (missing ? `, ${missing} missing entry files` : ""),
);
if (!dryRun) console.log(`Report: ${reportPath}`);

process.exit(missing > 0 ? 1 : 0);
