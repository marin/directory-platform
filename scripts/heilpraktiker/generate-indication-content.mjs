#!/usr/bin/env node
import { writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import { computeIndicationStats } from "../../src/lib/aggregates/compute.ts";
import { buildIndicationHubCopy } from "../../src/lib/data/indication-hubs.ts";
import { ROOT } from "../lib/work-utils.mjs";

const dirs = [
  "data/generated/indication-intros",
  "data/generated/indication-faqs",
];

for (const dir of dirs) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) mkdirSync(full, { recursive: true });
  for (const file of readdirSync(full).filter((f) => f.endsWith(".json"))) {
    unlinkSync(join(full, file));
  }
}

const dataset = loadDataset();
let written = 0;

for (const indication of dataset.indications) {
  const listingCount = computeIndicationStats(dataset.entries, indication.id).listingCount;
  if (listingCount === 0) continue;

  const copy = buildIndicationHubCopy(
    indication,
    dataset.entries,
    dataset.areas,
    dataset.categories,
  );

  writeFileSync(
    join(ROOT, `data/generated/indication-intros/${indication.id}.json`),
    `${JSON.stringify({ id: indication.id, intro: copy.intro }, null, 2)}\n`,
  );
  writeFileSync(
    join(ROOT, `data/generated/indication-faqs/${indication.id}.json`),
    `${JSON.stringify({ id: indication.id, faq: copy.faq }, null, 2)}\n`,
  );
  written += 1;
}

console.log(`Generated indication hub copy for ${written} indications.`);
