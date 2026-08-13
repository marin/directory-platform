#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/work-utils.mjs";
import { parseGermanOpeningHours } from "../../src/lib/data/parse-opening-hours.ts";

const CSV_PATH = join(
  ROOT,
  "heilpraktiker/heilpraktiker Google Maps Leads Scraper (1)_20260221_1201.csv",
);
const ENTRIES_DIR = join(ROOT, "data/entries");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function buildSlugMap(records) {
  const slugCounts = new Map();
  const hoursBySlug = new Map();

  for (const row of records) {
    const base = slugify(row.NAME ?? "heilpraktiker") || "heilpraktiker";
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    const slug =
      count === 0
        ? base
        : `${base}-${(row["PLACE ID"] ?? row.ID ?? String(count)).replace(/[^a-z0-9-]/gi, "").slice(0, 12).toLowerCase()}`;

    const openingHours = parseGermanOpeningHours(row["OPENING HOURS"]);
    if (openingHours.length > 0) {
      hoursBySlug.set(slug, openingHours);
    }
  }

  return hoursBySlug;
}

function main() {
  const raw = readFileSync(CSV_PATH, "utf-8").replace(/^\uFEFF/, "");
  const table = parseCsv(raw);
  const headers = table[0];
  const records = table.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
  const hoursBySlug = buildSlugMap(records);

  let updated = 0;
  let skipped = 0;

  for (const file of readdirSync(ENTRIES_DIR).filter((name) => name.endsWith(".json"))) {
    const slug = file.replace(/\.json$/, "");
    const openingHours = hoursBySlug.get(slug);
    if (!openingHours) {
      skipped += 1;
      continue;
    }

    const path = join(ENTRIES_DIR, file);
    const entry = JSON.parse(readFileSync(path, "utf-8"));
    entry.openingHours = openingHours;
    writeFileSync(path, `${JSON.stringify(entry, null, 2)}\n`);
    updated += 1;
  }

  console.log(`Opening hours backfill complete: ${updated} entries updated, ${skipped} unchanged.`);
}

if (!existsSync(CSV_PATH)) {
  console.error(`CSV not found: ${CSV_PATH}`);
  process.exit(1);
}

main();
