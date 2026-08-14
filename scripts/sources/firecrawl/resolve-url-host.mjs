import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../../lib/work-utils.mjs";

export function hostKey(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function preferSlug(candidates) {
  const withoutHash = candidates.filter((e) => !/-chij[a-z0-9]+$/i.test(e.slug));
  const pool = withoutHash.length ? withoutHash : candidates;
  return pool.sort((a, b) => a.slug.length - b.slug.length)[0];
}

export function loadEntriesByHost() {
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

export function resolveSlug(url, byHost, hostOverrides = {}) {
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

export function resolveUrlJobs(urls, hostOverrides = {}) {
  const byHost = loadEntriesByHost();
  return urls.map((url) => {
    const { slug, reason, host } = resolveSlug(url, byHost, hostOverrides);
    return { url, slug, reason, host };
  });
}
