#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import importsConfig from "../../../config/imports.config.ts";
import { extractOffersFromMarkdown } from "../../../src/lib/data/extract-prices.ts";
import { loadEnv } from "../../lib/load-env.mjs";
import { ROOT, ensureWorkDir } from "../../lib/work-utils.mjs";
import {
  getBatchDelayMs,
  scrapeUrl,
  sleep,
} from "./firecrawl-client.mjs";

loadEnv();

const args = process.argv.slice(2);
const useFixture = !process.env.FIRECRAWL_API_KEY || args.includes("--fixture");
const dryRun = args.includes("--dry-run");

const config = JSON.parse(readFileSync(join(ROOT, "data/firecrawl-price-urls.json"), "utf-8"));
const hostOverrides = config.hostOverrides ?? {};

function hostKey(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function preferSlug(candidates) {
  const withoutHash = candidates.filter((e) => !/-chij[a-z0-9]+$/i.test(e.slug));
  const pool = withoutHash.length ? withoutHash : candidates;
  return pool.sort((a, b) => a.slug.length - b.slug.length)[0];
}

function loadEntriesByHost() {
  const byHost = new Map();
  for (const file of readdirSync(join(ROOT, "data/entries")).filter((f) => f.endsWith(".json"))) {
    const entry = JSON.parse(readFileSync(join(ROOT, "data/entries", file), "utf-8"));
    if (!entry.website) continue;
    const key = hostKey(entry.website);
    if (!key) continue;
    if (!byHost.has(key)) byHost.set(key, []);
    byHost.get(key).push(entry);
  }
  return byHost;
}

function resolveSlug(url, byHost) {
  const host = hostKey(url);
  if (!host) return { slug: null, reason: "invalid_url" };
  if (hostOverrides[host]) {
    return { slug: hostOverrides[host], reason: "override" };
  }
  const hits = byHost.get(host) ?? [];
  if (hits.length === 1) return { slug: hits[0].slug, reason: "host_match" };
  if (hits.length > 1) return { slug: preferSlug(hits).slug, reason: "host_match_duplicate" };
  return { slug: null, reason: "no_entry", host };
}

const byHost = loadEntriesByHost();
const jobs = config.urls.map((url) => {
  const { slug, reason, host } = resolveSlug(url, byHost);
  return { url, slug, reason, host };
});

const matched = jobs.filter((j) => j.slug);
const unmatched = jobs.filter((j) => !j.slug);

console.log(`Price URLs: ${jobs.length}, matched: ${matched.length}, unmatched: ${unmatched.length}`);
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
  console.error("Usage: data:firecrawl:prices -- --yes [--dry-run] [--fixture]");
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
  const mdPath = join(outDir, "prices.md");
  const manifestPath = join(outDir, "prices-manifest.json");
  const extractedPath = join(outDir, "prices-extracted.json");

  try {
    let markdown = "";
    let metadata = null;

    if (useFixture) {
      markdown = "| Behandlung | Preis |\n|---|---|\n| Erstgespräch | 80 € |\n";
      metadata = { creditsUsed: 0, title: "Fixture prices" };
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

    const offers = extractOffersFromMarkdown(markdown);
    const manifest = {
      slug: job.slug,
      priceUrl: job.url,
      scrapedAt: new Date().toISOString(),
      matchReason: job.reason,
      metadata,
      offerCount: offers.length,
    };

    writeFileSync(mdPath, markdown);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    writeFileSync(
      extractedPath,
      JSON.stringify({ slug: job.slug, priceUrl: job.url, offers }, null, 2) + "\n",
    );

    ok += 1;
    summary.push({ slug: job.slug, offers: offers.length, url: job.url });
    console.log(
      `[${n}/${matched.length}] ok  ${job.slug} (${offers.length} offers, ${markdown.length} chars)`,
    );
  } catch (err) {
    fail += 1;
    console.error(`[${n}/${matched.length}] FAIL ${job.slug}: ${err.message ?? err}`);
  }

  if (i < matched.length - 1 && !useFixture) {
    await sleep(delayMs);
  }
}

const reportPath = join(ROOT, "work/scrapes/price-scrape-report.json");
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
