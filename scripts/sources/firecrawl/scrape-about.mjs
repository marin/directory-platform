#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { extractAboutFromMarkdown } from "../../../src/lib/data/extract-about.ts";
import { loadEnv } from "../../lib/load-env.mjs";
import { ROOT, ensureWorkDir } from "../../lib/work-utils.mjs";
import { getBatchDelayMs, scrapeUrl, sleep } from "./firecrawl-client.mjs";
import { resolveUrlJobs } from "./resolve-url-host.mjs";

loadEnv();

const args = process.argv.slice(2);
const useFixture = !process.env.FIRECRAWL_API_KEY || args.includes("--fixture");
const dryRun = args.includes("--dry-run");
const skipScraped = args.includes("--skip-scraped");

const config = JSON.parse(readFileSync(join(ROOT, "data/firecrawl-about-urls.json"), "utf-8"));
const hostOverrides = config.hostOverrides ?? {};
const jobs = resolveUrlJobs(config.urls, hostOverrides);
const matched = jobs.filter((j) => j.slug);
const unmatched = jobs.filter((j) => !j.slug);
const pending = skipScraped
  ? matched.filter((job) => !existsSync(join(ROOT, "work/scrapes/firecrawl", job.slug, "about.md")))
  : matched;

console.log(`About URLs: ${jobs.length}, matched: ${matched.length}, pending: ${pending.length}, unmatched: ${unmatched.length}`);
if (unmatched.length) {
  for (const u of unmatched) {
    console.log(`  unmatched: ${u.url} (${u.host ?? u.reason})`);
  }
}

if (dryRun) {
  for (const j of matched) {
    console.log(`${j.slug} <- ${j.url} [${j.reason}]`);
  }
  process.exit(unmatched.length ? 1 : 0);
}

if (!args.includes("--yes") && !useFixture) {
  console.error("Usage: data:firecrawl:about -- --yes [--dry-run] [--fixture]");
  process.exit(1);
}

const delayMs = getBatchDelayMs();
let ok = 0;
let fail = 0;
let credits = 0;
const summary = [];

for (let i = 0; i < pending.length; i += 1) {
  const job = pending[i];
  const n = i + 1;
  const outDir = ensureWorkDir("scrapes/firecrawl", job.slug);
  const mdPath = join(outDir, "about.md");
  const manifestPath = join(outDir, "about-manifest.json");
  const extractedPath = join(outDir, "about-extracted.json");

  try {
    let markdown = "";
    let metadata = null;

    if (useFixture) {
      markdown = "## Über mich\n\nIch bin Heilpraktikerin in Berlin und begleite Menschen ganzheitlich.\n";
      metadata = { creditsUsed: 0, title: "Fixture about" };
    } else {
      const data = await scrapeUrl(job.url, {
        onRateLimit: ({ attempt, maxRetries, waitMs: wait }) => {
          console.error(
            `[${n}/${pending.length}] ${job.slug}: rate limited, waiting ${Math.round(wait / 1000)}s (${attempt}/${maxRetries})`,
          );
        },
      });
      markdown = data.markdown ?? "";
      metadata = data.metadata ?? null;
      credits += metadata?.creditsUsed ?? 1;
    }

    const about = extractAboutFromMarkdown(markdown);
    const manifest = {
      slug: job.slug,
      aboutUrl: job.url,
      scrapedAt: new Date().toISOString(),
      matchReason: job.reason,
      metadata,
      paragraphCount: about.paragraphs.length,
      charCount: about.charCount,
    };

    writeFileSync(mdPath, markdown);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    writeFileSync(
      extractedPath,
      JSON.stringify({ slug: job.slug, aboutUrl: job.url, ...about }, null, 2) + "\n",
    );

    ok += 1;
    summary.push({
      slug: job.slug,
      paragraphs: about.paragraphs.length,
      chars: about.charCount,
      url: job.url,
    });
    console.log(
      `[${n}/${pending.length}] ok  ${job.slug} (${about.paragraphs.length} paragraphs, ${markdown.length} chars)`,
    );
  } catch (err) {
    fail += 1;
    console.error(`[${n}/${pending.length}] FAIL ${job.slug}: ${err.message ?? err}`);
  }

  if (i < pending.length - 1 && !useFixture) {
    await sleep(delayMs);
  }
}

const reportPath = join(ROOT, "work/scrapes/about-scrape-report.json");
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      scrapedAt: new Date().toISOString(),
      ok,
      fail,
      credits,
      unmatched,
      summary,
    },
    null,
    2,
  ) + "\n",
);

console.log("");
console.log(`Done: ${ok} succeeded, ${fail} failed, ${credits} credits`);
console.log(`Report: ${reportPath}`);

process.exit(fail > 0 || unmatched.length > 0 ? 1 : 0);
