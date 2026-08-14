#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import {
  descriptionFromAbout,
  isBoilerplateDescription,
} from "../../src/lib/data/extract-about.ts";
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
  const path = join(SCRAPES_DIR, slug, "about-extracted.json");
  if (!existsSync(path)) return null;
  const data = JSON.parse(readFileSync(path, "utf-8"));
  if (!Array.isArray(data.paragraphs) || data.paragraphs.length === 0) return null;
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

  const description = descriptionFromAbout(extracted.paragraphs);
  if (!description) {
    skipped += 1;
    report.push({ slug, status: "skipped_no_usable_bio", paragraphs: extracted.paragraphs.length });
    continue;
  }

  const entryPath = join(ENTRIES_DIR, `${slug}.json`);
  if (!existsSync(entryPath)) {
    missing += 1;
    report.push({ slug, status: "missing_entry", paragraphs: extracted.paragraphs.length });
    continue;
  }

  const current = entrySchema.parse(JSON.parse(readFileSync(entryPath, "utf-8")));
  if (!force && !isBoilerplateDescription(current.description)) {
    skipped += 1;
    report.push({ slug, status: "skipped_custom_description", paragraphs: extracted.paragraphs.length });
    continue;
  }

  const proposed = {
    ...current,
    description,
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
    descriptionLength: description.length,
    aboutUrl: extracted.aboutUrl,
  });
}

const reportPath = join(ROOT, "work/scrapes/about-merge-report.json");
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
  `${dryRun ? "Would update" : "Updated"} ${updated} descriptions` +
    (skipped ? `, skipped ${skipped}` : "") +
    (missing ? `, ${missing} missing entry files` : ""),
);
if (!dryRun) console.log(`Report: ${reportPath}`);

process.exit(missing > 0 ? 1 : 0);
