#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import { hasSubstantiveChange } from "../../src/lib/freshness/substantive-change.ts";
import { ROOT } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const faqOnly = args.includes("--faq-only");
const descriptionOnly = args.includes("--description-only");
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1]
  ?? (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

const STAGING_DIR = join(ROOT, "work/staging/enriched");
const ENTRIES_DIR = join(ROOT, "data/entries");
const today = new Date().toISOString().slice(0, 10);

function listStagingSlugs() {
  return readdirSync(STAGING_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".meta.json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((slug) => {
      const metaPath = join(STAGING_DIR, `${slug}.meta.json`);
      if (!existsSync(metaPath)) return true;
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
      if (meta.mode === "fixture") return false;
      if (faqOnly && !Array.isArray(meta.topics)) return false;
      if (descriptionOnly && meta.kind !== "description") return false;
      return true;
    });
}

const slugs = slugArg ? [slugArg] : listStagingSlugs();

let updated = 0;
let skipped = 0;
let missing = 0;
const report = [];

for (const slug of slugs) {
  const stagingPath = join(STAGING_DIR, `${slug}.json`);
  const proposed = entrySchema.parse(JSON.parse(readFileSync(stagingPath, "utf-8")));
  const entryPath = join(ENTRIES_DIR, `${slug}.json`);
  if (!existsSync(entryPath)) {
    missing += 1;
    report.push({ slug, status: "missing_entry" });
    continue;
  }

  const current = entrySchema.parse(JSON.parse(readFileSync(entryPath, "utf-8")));
  const finalProposed = faqOnly
    ? {
        ...current,
        faq: proposed.faq ?? [],
        lastUpdated: today,
      }
    : descriptionOnly
      ? {
          ...current,
          description: proposed.description,
          lastUpdated: today,
        }
    : {
        ...current,
        description: proposed.description,
        faq: proposed.faq ?? current.faq,
        lastUpdated: today,
      };

  const substantive = hasSubstantiveChange(current, finalProposed);
  const final = {
    ...finalProposed,
    lastUpdated: substantive ? today : current.lastUpdated,
  };

  if (
    current.description === final.description &&
    JSON.stringify(current.faq ?? []) === JSON.stringify(final.faq ?? [])
  ) {
    skipped += 1;
    report.push({ slug, status: "skipped_no_changes" });
    continue;
  }

  entrySchema.parse(final);

  if (!dryRun) {
    writeFileSync(entryPath, JSON.stringify(final, null, 2) + "\n");
  }

  updated += 1;
  report.push({
    slug,
    status: dryRun ? "would_update" : "updated",
    faq: (final.faq ?? []).length,
    descriptionLength: final.description.length,
  });
}

const reportPath = join(ROOT, "work/scrapes/enrichment-merge-report.json");
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
