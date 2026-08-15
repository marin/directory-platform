#!/usr/bin/env node
import { writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import { computeAssociationStats } from "../../src/lib/aggregates/compute.ts";
import { buildAssociationHubCopy } from "../../src/lib/data/association-hubs.ts";
import { ROOT } from "../lib/work-utils.mjs";

const dirs = [
  "data/generated/association-intros",
  "data/generated/association-faqs",
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

for (const association of dataset.associations) {
  const listingCount = computeAssociationStats(dataset.entries, association.id).listingCount;
  if (listingCount === 0) continue;

  const copy = buildAssociationHubCopy(
    association,
    dataset.entries,
    dataset.areas,
    dataset.categories,
  );

  writeFileSync(
    join(ROOT, `data/generated/association-intros/${association.id}.json`),
    `${JSON.stringify({ id: association.id, intro: copy.intro }, null, 2)}\n`,
  );
  writeFileSync(
    join(ROOT, `data/generated/association-faqs/${association.id}.json`),
    `${JSON.stringify({ id: association.id, faq: copy.faq }, null, 2)}\n`,
  );
  written += 1;
}

console.log(`Generated association hub copy for ${written} associations.`);
