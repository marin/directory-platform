#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import importsConfig from "../../../config/imports.config.ts";
import { ROOT, ensureWorkDir } from "../../lib/work-utils.mjs";

const args = process.argv.slice(2);
const slug = args[args.indexOf("--slug") + 1];
const useFixture = !process.env.FIRECRAWL_API_KEY || args.includes("--fixture");
const maxPages = parseInt(
  args[args.indexOf("--max-pages-per-site") + 1] ?? String(importsConfig.firecrawl?.maxPagesPerSite ?? 8),
  10,
) || 8;

if (!slug) {
  console.error("Usage: data:firecrawl:scrape -- --slug <slug> [--fixture] [--yes]");
  process.exit(1);
}

const estimatedCost = maxPages;
console.log(`Estimated pages: ${maxPages}, approximate credits: ${estimatedCost}`);
if (!args.includes("--yes") && !useFixture && estimatedCost > importsConfig.firecrawl.confirmThreshold) {
  console.error("Above threshold — re-run with --yes to confirm");
  process.exit(1);
}

const outDir = ensureWorkDir("scrapes/firecrawl", slug);
if (useFixture) {
  const fixture = JSON.parse(
    readFileSync(join(ROOT, "tests/fixtures/firecrawl/homepage.json"), "utf-8"),
  );
  writeFileSync(join(outDir, "homepage.json"), JSON.stringify(fixture, null, 2) + "\n");
  console.log(`Saved fixture scrape for ${slug}`);
} else {
  console.error("Live Firecrawl requires FIRECRAWL_API_KEY — use --fixture for offline mode");
  process.exit(1);
}
