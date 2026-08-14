#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import importsConfig from "../../../config/imports.config.ts";
import { loadEnv } from "../../lib/load-env.mjs";
import { ROOT } from "../../lib/work-utils.mjs";
import { readEntry, saveScrape, scrapeEntry } from "./firecrawl-client.mjs";

loadEnv();

const CREDITS_PER_PAGE = 1;
const args = process.argv.slice(2);
const slug = args[args.indexOf("--slug") + 1];
const useFixture = !process.env.FIRECRAWL_API_KEY || args.includes("--fixture");
const maxPages = parseInt(
  args[args.indexOf("--max-pages-per-site") + 1] ?? String(importsConfig.firecrawl?.maxPagesPerSite ?? 8),
  10,
) || 8;

if (!slug) {
  console.error("Usage: data:firecrawl:scrape -- --slug <slug> [--fixture] [--yes] [--max-pages-per-site N]");
  process.exit(1);
}

const estimatedCost = maxPages * CREDITS_PER_PAGE;
console.log(`Estimated pages: ${maxPages}, approximate credits: ${estimatedCost}`);
if (!args.includes("--yes") && !useFixture && estimatedCost > importsConfig.firecrawl.confirmThreshold) {
  console.error("Above threshold — re-run with --yes to confirm");
  process.exit(1);
}

try {
  if (useFixture) {
    const markdown = readFileSync(join(ROOT, "tests/fixtures/firecrawl/homepage.md"), "utf-8");
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "tests/fixtures/firecrawl/manifest.json"), "utf-8"),
    );
    saveScrape(slug, { manifest, markdown });
    console.log(`Saved fixture scrape for ${slug} → homepage.md, manifest.json`);
  } else {
    const entry = readEntry(slug);
    const result = await scrapeEntry(entry, {
      onRateLimit: ({ attempt, maxRetries, waitMs }) => {
        console.error(`Rate limited, waiting ${Math.round(waitMs / 1000)}s (${attempt}/${maxRetries})`);
      },
    });
    saveScrape(slug, result);

    const credits = result.manifest.metadata?.creditsUsed;
    const creditsNote = credits ? `, ${credits} credits used` : "";
    console.log(
      `Saved live scrape for ${slug} → homepage.md (${result.markdown.length} chars${creditsNote})`,
    );
  }
} catch (err) {
  console.error(err.message ?? err);
  process.exit(1);
}
