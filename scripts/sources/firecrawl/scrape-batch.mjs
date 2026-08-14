#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import importsConfig from "../../../config/imports.config.ts";
import { loadEnv } from "../../lib/load-env.mjs";
import { ROOT } from "../../lib/work-utils.mjs";
import {
  getBatchDelayMs,
  listPendingSlugs,
  loadSkipSlugs,
  recordScrapeFailure,
  saveScrape,
  scrapeEntry,
  sleep,
} from "./firecrawl-client.mjs";

loadEnv();

const args = process.argv.slice(2);
const limit = parseInt(args[args.indexOf("--limit") + 1] ?? "50", 10) || 50;
const useFixture = !process.env.FIRECRAWL_API_KEY || args.includes("--fixture");
const includeScraped = args.includes("--include-scraped");

if (!args.includes("--yes") && !useFixture) {
  console.error("Usage: data:firecrawl:batch -- --limit <n> --yes [--include-scraped] [--fixture]");
  process.exit(1);
}

const pending = listPendingSlugs({ limit, skipScraped: !includeScraped });
const skippedCount = loadSkipSlugs().size;
const estimatedCost = pending.length;
const delayMs = getBatchDelayMs();

console.log(
  `Batch: ${pending.length} listings, ~${estimatedCost} credits, ${delayMs}ms delay, ${skippedCount} skipped`,
);

if (pending.length === 0) {
  console.log("Nothing to scrape.");
  process.exit(0);
}

if (!useFixture && estimatedCost > importsConfig.firecrawl.confirmThreshold && !args.includes("--yes")) {
  console.error("Above threshold — re-run with --yes to confirm");
  process.exit(1);
}

let ok = 0;
let fail = 0;
let credits = 0;
const failed = [];

for (let i = 0; i < pending.length; i += 1) {
  const entry = pending[i];
  const n = i + 1;

  try {
    if (useFixture) {
      const markdown = readFileSync(join(ROOT, "tests/fixtures/firecrawl/homepage.md"), "utf-8");
      const manifest = JSON.parse(
        readFileSync(join(ROOT, "tests/fixtures/firecrawl/manifest.json"), "utf-8"),
      );
      saveScrape(entry.slug, { manifest: { ...manifest, slug: entry.slug }, markdown });
    } else {
      const result = await scrapeEntry(entry, {
        onRateLimit: ({ attempt, maxRetries, waitMs }) => {
          console.error(
            `[${n}/${pending.length}] ${entry.slug}: rate limited, waiting ${Math.round(waitMs / 1000)}s (${attempt}/${maxRetries})`,
          );
        },
      });
      saveScrape(entry.slug, result);
      const used = result.manifest.metadata?.creditsUsed ?? 1;
      credits += used;
      console.log(
        `[${n}/${pending.length}] ok  ${entry.slug} (${result.markdown.length} chars, ${used} cr)`,
      );
    }
    ok += 1;
  } catch (err) {
    fail += 1;
    failed.push(entry.slug);
    const message = err.message ?? String(err);
    if (recordScrapeFailure(entry.slug, message)) {
      console.error(`[${n}/${pending.length}] SKIP ${entry.slug}: ${message}`);
    } else {
      console.error(`[${n}/${pending.length}] FAIL ${entry.slug}: ${message}`);
    }
  }

  if (i < pending.length - 1) {
    await sleep(delayMs);
  }
}

console.log("");
console.log(`Done: ${ok} succeeded, ${fail} failed, ${credits} credits used`);
if (failed.length > 0) {
  console.log("Failed slugs:");
  for (const slug of failed) {
    console.log(` - ${slug}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
