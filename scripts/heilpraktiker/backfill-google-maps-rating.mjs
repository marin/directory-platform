#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/work-utils.mjs";
import { extractPlaceIdFromGoogleMapsUrl } from "../../src/lib/geo/google-maps.ts";
import { parseGoogleMapsRatingFields } from "../../src/lib/geo/google-maps-rating.ts";

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

function buildRatingByPlaceId(records) {
  const ratingByPlaceId = new Map();

  for (const row of records) {
    const placeId = (row["PLACE ID"] ?? "").trim();
    if (!placeId) continue;

    const ratingFields = parseGoogleMapsRatingFields(row.SCORE, row.RATINGS);
    if (ratingFields) {
      ratingByPlaceId.set(placeId, ratingFields);
    }
  }

  return ratingByPlaceId;
}

function main() {
  const raw = readFileSync(CSV_PATH, "utf-8").replace(/^\uFEFF/, "");
  const table = parseCsv(raw);
  const headers = table[0];
  const records = table.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
  const ratingByPlaceId = buildRatingByPlaceId(records);

  let updated = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const file of readdirSync(ENTRIES_DIR).filter((name) => name.endsWith(".json"))) {
    const path = join(ENTRIES_DIR, file);
    const entry = JSON.parse(readFileSync(path, "utf-8"));
    const placeId = extractPlaceIdFromGoogleMapsUrl(entry.googleMapsUrl);
    if (!placeId) {
      unmatched += 1;
      continue;
    }

    const ratingFields = ratingByPlaceId.get(placeId);
    if (!ratingFields) {
      skipped += 1;
      continue;
    }

    if (
      entry.googleMapsRating === ratingFields.googleMapsRating &&
      entry.googleMapsRatingsCount === ratingFields.googleMapsRatingsCount
    ) {
      skipped += 1;
      continue;
    }

    entry.googleMapsRating = ratingFields.googleMapsRating;
    entry.googleMapsRatingsCount = ratingFields.googleMapsRatingsCount;
    writeFileSync(path, `${JSON.stringify(entry, null, 2)}\n`);
    updated += 1;
  }

  console.log(
    `Google Maps rating backfill complete: ${updated} entries updated, ${skipped} unchanged, ${unmatched} without place ID.`,
  );
}

if (!existsSync(CSV_PATH)) {
  console.error(`CSV not found: ${CSV_PATH}`);
  process.exit(1);
}

main();
