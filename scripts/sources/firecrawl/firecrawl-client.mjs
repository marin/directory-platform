import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import importsConfig from "../../../config/imports.config.ts";
import { ROOT, ensureWorkDir } from "../../lib/work-utils.mjs";

const FIRECRAWL_API = "https://api.firecrawl.dev/v2/scrape";
const SKIP_PATH = join(ROOT, "data/firecrawl-skip.json");

export function loadSkipSlugs() {
  if (!existsSync(SKIP_PATH)) return new Set();
  const data = JSON.parse(readFileSync(SKIP_PATH, "utf-8"));
  return new Set(data.slugs ?? []);
}

export function isPermanentFailure(message) {
  return /DNS resolution failed|do not support this site|SSL\/TLS certificate error|All scraping engines failed/i.test(
    String(message ?? ""),
  );
}

export function recordScrapeFailure(slug, message) {
  if (!isPermanentFailure(message)) return false;

  const data = existsSync(SKIP_PATH)
    ? JSON.parse(readFileSync(SKIP_PATH, "utf-8"))
    : { slugs: [], reasons: {} };
  if (data.slugs.includes(slug)) return false;

  data.slugs.push(slug);
  if (/DNS resolution failed/i.test(message)) {
    data.reasons[slug] = "dns_failure";
  } else if (/do not support this site/i.test(message)) {
    data.reasons[slug] = "unsupported_site";
  } else if (/SSL\/TLS certificate error/i.test(message)) {
    data.reasons[slug] = "ssl_error";
  } else if (/All scraping engines failed/i.test(message)) {
    data.reasons[slug] = "blocked_site";
  } else {
    data.reasons[slug] = "scrape_failed";
  }

  writeFileSync(SKIP_PATH, JSON.stringify(data, null, 2) + "\n");
  return true;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseRetryAfterMs(message) {
  const match = String(message ?? "").match(/retry after (\d+)s/i);
  if (match) return (Number(match[1]) + 1) * 1000;
  return null;
}

export function isRateLimitError(status, message) {
  return status === 429 || /rate limit exceeded/i.test(String(message ?? ""));
}

export function readEntry(entrySlug) {
  const path = join(ROOT, `data/entries/${entrySlug}.json`);
  if (!existsSync(path)) {
    throw new Error(`Entry not found: ${entrySlug}`);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function listPendingSlugs({ limit, skipScraped = true } = {}) {
  const entries = readdirSync(join(ROOT, "data/entries"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(ROOT, "data/entries", f), "utf-8")))
    .filter((e) => e.website);

  const scraped = new Set();
  const scrapeDir = join(ROOT, "work/scrapes/firecrawl");
  if (skipScraped && existsSync(scrapeDir)) {
    for (const dir of readdirSync(scrapeDir)) {
      if (existsSync(join(scrapeDir, dir, "homepage.md"))) {
        scraped.add(dir);
      }
    }
  }

  const skipped = loadSkipSlugs();
  const pending = entries.filter((e) => !scraped.has(e.slug) && !skipped.has(e.slug));
  return typeof limit === "number" ? pending.slice(0, limit) : pending;
}

export function scrapePaths(slug) {
  const outDir = ensureWorkDir("scrapes/firecrawl", slug);
  return {
    outDir,
    markdownPath: join(outDir, "homepage.md"),
    manifestPath: join(outDir, "manifest.json"),
  };
}

export function saveScrape(slug, { manifest, markdown }) {
  const { markdownPath, manifestPath } = scrapePaths(slug);
  writeFileSync(markdownPath, markdown);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return { markdownPath, manifestPath };
}

function buildManifest(entry, data) {
  return {
    slug: entry.slug,
    url: entry.website,
    scrapedAt: new Date().toISOString(),
    metadata: data.metadata ?? null,
  };
}

export async function scrapeUrl(url, options = {}) {
  const maxRetries = options.maxRetries ?? importsConfig.firecrawl?.maxRetries ?? 5;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const res = await fetch(FIRECRAWL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        onlyMainContent: true,
        formats: ["markdown"],
      }),
    });

    const body = await res.json();
    const message = body.error ?? body.message;

    if (isRateLimitError(res.status, message)) {
      if (attempt >= maxRetries) {
        throw new Error(message ?? "Firecrawl rate limit exceeded");
      }
      const waitMs = parseRetryAfterMs(message) ?? 20_000;
      if (options.onRateLimit) {
        options.onRateLimit({ attempt, maxRetries, waitMs, message });
      }
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      throw new Error(message ?? `Firecrawl API error: ${res.status}`);
    }
    if (!body.success) {
      throw new Error(message ?? "Firecrawl scrape failed");
    }

    return body.data ?? {};
  }

  throw new Error("Firecrawl scrape failed after retries");
}

export async function scrapeEntry(entry, options = {}) {
  if (!entry.website) {
    throw new Error(`Entry ${entry.slug} has no website URL`);
  }

  const data = await scrapeUrl(entry.website, options);
  return {
    manifest: buildManifest(entry, data),
    markdown: data.markdown ?? "",
  };
}

export function getBatchDelayMs() {
  return importsConfig.firecrawl?.minDelayMs ?? 7000;
}
