#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, ensureWorkDir } from "../../lib/work-utils.mjs";

const args = process.argv.slice(2);
const runId = args[args.indexOf("--run") + 1] ?? "fixture-run";
const importPath = join(ROOT, `work/imports/lobstr/${runId}.json`);

const raw = JSON.parse(readFileSync(importPath, "utf-8"));
const results = raw.results ?? [];

const candidates = results.map((r, i) => ({
  externalId: r.place_id ?? r.id ?? `lobstr-${i}`,
  name: r.name ?? r.businessName ?? "Unknown",
  address: typeof r.address === "string"
    ? { street: r.address, locality: "Austin", region: "Texas", country: "US" }
    : r.address,
  phone: r.phone ?? r.phoneNumber,
  website: r.website ?? r.url,
  rawCategory: r.category ?? r.categories?.[0],
  status: r.permanently_closed ? "closed" : "open",
}));

const outDir = ensureWorkDir("staging/candidates");
for (const c of candidates) {
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  writeFileSync(join(outDir, `${slug}.json`), JSON.stringify(c, null, 2) + "\n");
}
console.log(`Normalized ${candidates.length} candidates → work/staging/candidates/`);
