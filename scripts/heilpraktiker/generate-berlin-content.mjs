#!/usr/bin/env node
import { writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import { computeCategoryStats, computeAreaStats } from "../../src/lib/aggregates/compute.ts";
import { ROOT } from "../lib/work-utils.mjs";

const dirs = [
  "data/generated/category-intros",
  "data/generated/category-faqs",
  "data/generated/area-intros",
  "data/generated/area-faqs",
];

for (const dir of dirs) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) mkdirSync(full, { recursive: true });
  for (const file of readdirSync(full).filter((f) => f.endsWith(".json"))) {
    unlinkSync(join(full, file));
  }
}

const dataset = loadDataset();

for (const category of dataset.categories) {
  const stats = computeCategoryStats(dataset.entries, category.id);
  writeFileSync(
    join(ROOT, `data/generated/category-intros/${category.id}.json`),
    `${JSON.stringify(
      {
        id: category.id,
        intro: `In Berlin finden Sie ${stats.listingCount} Heilpraktiker mit Schwerpunkt ${category.name}.`,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(ROOT, `data/generated/category-faqs/${category.id}.json`),
    `${JSON.stringify(
      {
        id: category.id,
        faq: [
          {
            question: `Wie viele Heilpraktiker für ${category.name} gibt es in Berlin?`,
            answer: `Aktuell listet dieses Verzeichnis ${stats.listingCount} offene Heilpraktiker in der Kategorie ${category.name}.`,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

for (const area of dataset.areas) {
  const stats = computeAreaStats(dataset.entries, area.id);
  writeFileSync(
    join(ROOT, `data/generated/area-intros/${area.id}.json`),
    `${JSON.stringify(
      {
        id: area.id,
        intro: `Im Bezirk ${area.name} sind ${stats.listingCount} Heilpraktiker in diesem Verzeichnis gelistet.`,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(ROOT, `data/generated/area-faqs/${area.id}.json`),
    `${JSON.stringify(
      {
        id: area.id,
        faq: [
          {
            question: `Wie viele Heilpraktiker gibt es in ${area.name}?`,
            answer: `In ${area.name} finden Sie ${stats.listingCount} gelistete Heilpraktiker-Praxen.`,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

console.log("Generated Berlin category and area content.");
