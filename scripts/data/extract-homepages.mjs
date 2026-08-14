#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { extractHomepage } from "../../src/lib/data/extract-homepage.ts";
import { ROOT } from "../lib/work-utils.mjs";

const ENTRIES_DIR = join(ROOT, "data/entries");
const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1]
  ?? (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

const SCRAPES_DIR = join(ROOT, "work/scrapes/firecrawl");

function loadScrape(slug) {
  const mdPath = join(SCRAPES_DIR, slug, "homepage.md");
  if (!existsSync(mdPath)) return null;
  const markdown = readFileSync(mdPath, "utf-8");
  const manifestPath = join(SCRAPES_DIR, slug, "manifest.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf-8"))
    : {};
  const metadata = manifest.metadata ?? null;
  const baseUrl = manifest.metadata?.url ?? manifest.url;
  const entryPath = join(ENTRIES_DIR, `${slug}.json`);
  const entryName = existsSync(entryPath)
    ? JSON.parse(readFileSync(entryPath, "utf-8")).name
    : undefined;
  const extracted = extractHomepage(markdown, metadata, baseUrl, entryName);
  return { slug, markdown, manifest, extracted };
}

const slugs = slugArg
  ? [slugArg]
  : readdirSync(SCRAPES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((slug) => existsSync(join(SCRAPES_DIR, slug, "homepage.md")));

let processed = 0;
let thin = 0;
let spam = 0;
const summary = [];

for (const slug of slugs) {
  const scrape = loadScrape(slug);
  if (!scrape) continue;

  const { extracted } = scrape;
  const outPath = join(SCRAPES_DIR, slug, "homepage-extracted.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        slug,
        homepageUrl: scrape.manifest.url,
        scrapedAt: scrape.manifest.scrapedAt,
        ...extracted,
      },
      null,
      2,
    ) + "\n",
  );

  processed += 1;
  if (extracted.flags.thin) thin += 1;
  if (extracted.flags.spam) spam += 1;
  summary.push({
    slug,
    images: extracted.images.length,
    bookingUrl: Boolean(extracted.bookingUrl),
    offers: extracted.offers.length,
    thin: extracted.flags.thin,
    spam: extracted.flags.spam,
    chars: extracted.flags.charCount,
  });
}

const reportPath = join(ROOT, "work/scrapes/homepage-extraction-report.json");
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      extractedAt: new Date().toISOString(),
      processed,
      thin,
      spam,
      withImages: summary.filter((s) => s.images > 0).length,
      withBookingUrl: summary.filter((s) => s.bookingUrl).length,
      withOffers: summary.filter((s) => s.offers > 0).length,
      summary,
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `Extracted ${processed} homepages` +
    ` (${summary.filter((s) => s.images > 0).length} images,` +
    ` ${summary.filter((s) => s.bookingUrl).length} booking URLs,` +
    ` ${summary.filter((s) => s.offers > 0).length} offers)` +
    ` — thin: ${thin}, spam: ${spam}`,
);
console.log(`Report: ${reportPath}`);
