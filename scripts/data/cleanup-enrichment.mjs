#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import {
  descriptionFromAbout,
  extractAboutFromMarkdown,
  isCookieOrConsentText,
  sanitizeDirectoryText,
  sanitizeFaqItems,
  stripCookieSentences,
  templateDescription,
} from "../../src/lib/data/extract-about.ts";
import { filterUsableOffers } from "../../src/lib/data/offers-from-extracted.ts";
import { hasSubstantiveChange } from "../../src/lib/freshness/substantive-change.ts";
import { ROOT } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1]
  ?? (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

const SCRAPES_DIR = join(ROOT, "work/scrapes/firecrawl");
const ENTRIES_DIR = join(ROOT, "data/entries");
const today = new Date().toISOString().slice(0, 10);

function loadMarkdown(slug, filename) {
  const path = join(SCRAPES_DIR, slug, filename);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

function descriptionFromScrapes(slug) {
  const aboutMd = loadMarkdown(slug, "about.md");
  const homeMd = loadMarkdown(slug, "homepage.md");
  for (const markdown of [aboutMd, homeMd]) {
    if (!markdown) continue;
    const description = descriptionFromAbout(extractAboutFromMarkdown(markdown).paragraphs);
    if (description && !isCookieOrConsentText(description)) return description;
  }
  return null;
}

function repairDescription(entry) {
  let description = entry.description;
  if (isCookieOrConsentText(description)) {
    const fromScrape = descriptionFromScrapes(entry.slug);
    if (fromScrape) description = fromScrape;
    else {
      const stripped = stripCookieSentences(description);
      description =
        stripped.length >= 80 && !isCookieOrConsentText(stripped)
          ? stripped
          : templateDescription(entry.name, entry.categories);
    }
  }

  description = sanitizeDirectoryText(description);
  if (description.length < 80) {
    return templateDescription(entry.name, entry.categories);
  }
  return description;
}

const files = slugArg
  ? [`${slugArg}.json`]
  : readdirSync(ENTRIES_DIR).filter((file) => file.endsWith(".json"));

let updated = 0;
let skipped = 0;
const report = [];

for (const file of files) {
  const entryPath = join(ENTRIES_DIR, file);
  const current = entrySchema.parse(JSON.parse(readFileSync(entryPath, "utf-8")));
  const offers = filterUsableOffers(current.offers ?? [], current.name);
  const description = repairDescription(current);
  const faq = sanitizeFaqItems(current.faq ?? []);

  const proposed = {
    ...current,
    description,
    offers,
    faq,
    lastUpdated: today,
  };
  const substantive = hasSubstantiveChange(current, proposed);
  const final = {
    ...proposed,
    lastUpdated: substantive ? today : current.lastUpdated,
  };

  if (
    current.description === final.description &&
    JSON.stringify(current.offers ?? []) === JSON.stringify(final.offers ?? []) &&
    JSON.stringify(current.faq ?? []) === JSON.stringify(final.faq ?? [])
  ) {
    skipped += 1;
    continue;
  }

  entrySchema.parse(final);

  if (!dryRun) {
    writeFileSync(entryPath, JSON.stringify(final, null, 2) + "\n");
  }

  updated += 1;
  report.push({
    slug: current.slug,
    status: dryRun ? "would_update" : "updated",
    descriptionRepaired: current.description !== final.description,
    offersBefore: (current.offers ?? []).length,
    offersAfter: (final.offers ?? []).length,
  });
}

const reportPath = join(ROOT, "work/scrapes/enrichment-cleanup-report.json");
if (!dryRun) {
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        cleanedAt: new Date().toISOString(),
        updated,
        skipped,
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
    (skipped ? `, skipped ${skipped}` : ""),
);
if (!dryRun) console.log(`Report: ${reportPath}`);
