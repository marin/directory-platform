#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractServicesFromMarkdown } from "../../../src/lib/data/extract-services.ts";
import { loadEnv } from "../../lib/load-env.mjs";
import { ROOT, ensureWorkDir } from "../../lib/work-utils.mjs";
import { getBatchDelayMs, scrapeUrl, sleep } from "./firecrawl-client.mjs";
import { resolveUrlJobs } from "./resolve-url-host.mjs";

loadEnv();

const args = process.argv.slice(2);
const useFixture = !process.env.FIRECRAWL_API_KEY || args.includes("--fixture");
const dryRun = args.includes("--dry-run");

const config = JSON.parse(readFileSync(join(ROOT, "data/firecrawl-services-urls.json"), "utf-8"));
const hostOverrides = config.hostOverrides ?? {};
const jobs = resolveUrlJobs(config.urls, hostOverrides);
const matched = jobs.filter((j) => j.slug);
const unmatched = jobs.filter((j) => !j.slug);

console.log(`Service URLs: ${jobs.length}, matched: ${matched.length}, unmatched: ${unmatched.length}`);
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
  console.error("Usage: data:firecrawl:services -- --yes [--dry-run] [--fixture]");
  process.exit(1);
}

const delayMs = getBatchDelayMs();
let ok = 0;
let fail = 0;
let credits = 0;
const summary = [];

for (let i = 0; i < matched.length; i += 1) {
  const job = matched[i];
  const n = i + 1;
  const outDir = ensureWorkDir("scrapes/firecrawl", job.slug);
  const mdPath = join(outDir, "services.md");
  const manifestPath = join(outDir, "services-manifest.json");
  const extractedPath = join(outDir, "services-extracted.json");

  try {
    let markdown = "";
    let metadata = null;

    if (useFixture) {
      markdown = "## Akupunktur\n\n- Erstgespräch und Anamnese\n- TCM-Behandlung\n";
      metadata = { creditsUsed: 0, title: "Fixture services" };
    } else {
      const data = await scrapeUrl(job.url, {
        onRateLimit: ({ attempt, maxRetries, waitMs: wait }) => {
          console.error(
            `[${n}/${matched.length}] ${job.slug}: rate limited, waiting ${Math.round(wait / 1000)}s (${attempt}/${maxRetries})`,
          );
        },
      });
      markdown = data.markdown ?? "";
      metadata = data.metadata ?? null;
      credits += metadata?.creditsUsed ?? 1;
    }

    const services = extractServicesFromMarkdown(markdown);
    const manifest = {
      slug: job.slug,
      servicesUrl: job.url,
      scrapedAt: new Date().toISOString(),
      matchReason: job.reason,
      metadata,
      serviceCount: services.length,
    };

    writeFileSync(mdPath, markdown);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    writeFileSync(
      extractedPath,
      JSON.stringify({ slug: job.slug, servicesUrl: job.url, services }, null, 2) + "\n",
    );

    ok += 1;
    summary.push({ slug: job.slug, services: services.length, url: job.url });
    console.log(
      `[${n}/${matched.length}] ok  ${job.slug} (${services.length} services, ${markdown.length} chars)`,
    );
  } catch (err) {
    fail += 1;
    console.error(`[${n}/${matched.length}] FAIL ${job.slug}: ${err.message ?? err}`);
  }

  if (i < matched.length - 1 && !useFixture) {
    await sleep(delayMs);
  }
}

const reportPath = join(ROOT, "work/scrapes/services-scrape-report.json");
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
