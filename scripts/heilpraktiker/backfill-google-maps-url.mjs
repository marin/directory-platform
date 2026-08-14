#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/work-utils.mjs";
import { resolveGoogleMapsUrl } from "../../src/lib/geo/google-maps.ts";

const CSV_PATH = join(
  ROOT,
  "heilpraktiker/heilpraktiker Google Maps Leads Scraper (1)_20260221_1201.csv",
);
const ENTRIES_DIR = join(ROOT, "data/entries");

const EXCLUDE_NAME = /ausbildung|fernstudium|schule|akademie|institut(?!.*praxis)|verein|verband|jobcenter/i;
const INCLUDE_SIGNAL =
  /heilpraktiker|naturheilpraktiker|alternativmedizin|naturheilkunde|naturheilpraktik|hom[öo]opath|osteopath|akupunkt|tcm|psychotherap|hypnos|schmerztherap|chiroprakt|ern[äa]hrungsberat/i;

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

function shouldInclude(row) {
  if ((row.CITY ?? "").trim().toLowerCase() !== "berlin") return false;
  if ((row["IS PERMANENTLY CLOSED"] ?? "").toUpperCase() === "TRUE") return false;
  if ((row["IS TEMPORARILY CLOSED"] ?? "").toUpperCase() === "TRUE") return false;

  const name = row.NAME ?? "";
  const category = row.CATEGORY ?? "";
  const text = `${name} ${category}`;

  if (EXCLUDE_NAME.test(text)) return false;
  if (!INCLUDE_SIGNAL.test(text)) return false;

  const phone = (row.PHONE ?? "").trim();
  const website = (row.WEBSITE ?? "").trim();
  if (!phone && !website) return false;

  return true;
}

function buildSlugMap(records) {
  const slugCounts = new Map();
  const mapsUrlBySlug = new Map();

  for (const row of records) {
    if (!shouldInclude(row)) continue;

    const base = slugify(row.NAME ?? "heilpraktiker") || "heilpraktiker";
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    const slug =
      count === 0
        ? base
        : `${base}-${(row["PLACE ID"] ?? row.ID ?? String(count)).replace(/[^a-z0-9-]/gi, "").slice(0, 12).toLowerCase()}`;

    const mapsUrl = resolveGoogleMapsUrl(row["PLACE ID"], row.URL);
    if (mapsUrl) {
      mapsUrlBySlug.set(slug, mapsUrl);
    }
  }

  return mapsUrlBySlug;
}

function main() {
  const raw = readFileSync(CSV_PATH, "utf-8").replace(/^\uFEFF/, "");
  const table = parseCsv(raw);
  const headers = table[0];
  const records = table.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
  const mapsUrlBySlug = buildSlugMap(records);

  let updated = 0;
  let skipped = 0;

  for (const file of readdirSync(ENTRIES_DIR).filter((name) => name.endsWith(".json"))) {
    const slug = file.replace(/\.json$/, "");
    const googleMapsUrl = mapsUrlBySlug.get(slug);
    if (!googleMapsUrl) {
      skipped += 1;
      continue;
    }

    const path = join(ENTRIES_DIR, file);
    const entry = JSON.parse(readFileSync(path, "utf-8"));
    if (entry.googleMapsUrl === googleMapsUrl) {
      skipped += 1;
      continue;
    }

    entry.googleMapsUrl = googleMapsUrl;
    writeFileSync(path, `${JSON.stringify(entry, null, 2)}\n`);
    updated += 1;
  }

  console.log(`Google Maps URL backfill complete: ${updated} entries updated, ${skipped} unchanged.`);
}

if (!existsSync(CSV_PATH)) {
  console.error(`CSV not found: ${CSV_PATH}`);
  process.exit(1);
}

main();
