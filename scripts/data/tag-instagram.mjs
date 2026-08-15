#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import { extractInstagram } from "../../src/lib/data/extract-instagram.ts";
import { hasSubstantiveChange } from "../../src/lib/freshness/substantive-change.ts";
import { ROOT, ensureWorkDir } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || !args.includes("--yes");
const slugArg =
  args.find((a) => a.startsWith("--slug="))?.split("=")[1] ??
  (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

if (!args.includes("--yes") && !args.includes("--dry-run")) {
  console.error("Usage: data:tag:instagram -- --yes [--dry-run] [--slug <slug>]");
  process.exit(1);
}

const ENTRIES_DIR = join(ROOT, "data/entries");
const SCRAPES_DIR = join(ROOT, "work/scrapes/firecrawl");
const today = new Date().toISOString().slice(0, 10);

function loadScrapeMarkdown(slug) {
  const parts = [];
  for (const file of ["homepage.md", "about.md"]) {
    const path = join(SCRAPES_DIR, slug, file);
    if (existsSync(path)) parts.push(readFileSync(path, "utf-8"));
  }
  return parts.length ? parts.join("\n\n") : null;
}

function applyInstagram(entry, instagramUrl) {
  const next = { ...entry };
  if (instagramUrl) next.instagramUrl = instagramUrl;
  else delete next.instagramUrl;
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

  const extracted = extractInstagram(markdown);
  const instagramUrl = extracted?.url;
  if (instagramUrl) tagged += 1;

  if ((current.instagramUrl ?? undefined) === instagramUrl) {
    skipped += 1;
    report.push({
      slug,
      status: "skipped_unchanged",
      instagramUrl,
      username: extracted?.username,
    });
    continue;
  }

  const proposed = applyInstagram({ ...current, lastUpdated: today }, instagramUrl);
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
    instagramUrl,
    username: extracted?.username,
    snippet: extracted?.snippet,
  });
}

const reportDir = ensureWorkDir("scrapes");
const reportPath = join(reportDir, "instagram-tag-report.json");
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
      entries: report.filter((row) => row.instagramUrl),
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
console.log(`Report: ${reportPath}`);
