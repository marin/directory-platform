#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/work-utils.mjs";

const CSV_PATH = join(
  ROOT,
  "heilpraktiker/heilpraktiker Google Maps Leads Scraper (1)_20260221_1201.csv",
);
const ENTRIES_DIR = join(ROOT, "data/entries");
const TODAY = "2026-08-12";

const METHODS = [
  ["osteopathie", /osteopath/i],
  ["homoeopathie", /hom[öo]opath/i],
  ["akupunktur-tcm", /akupunkt|tcm|traditionell.*chines|chinesisch.*medizin/i],
  ["psychotherapie", /psychotherap|psycholog|hpp|heilpraktiker.*psych/i],
  ["ernaehrungsberatung", /ern[äa]hrung|nutrition/i],
  ["hypnose", /hypnos/i],
  ["schmerztherapie", /schmerz/i],
  ["naturheilkunde", /naturheil|heilpraktiker|alternativ|ganzheit|umweltmedizin/i],
];

const PLZ_BEZIRK = {
  "101": "mitte",
  "102": "friedrichshain-kreuzberg",
  "103": "lichtenberg",
  "104": "pankow",
  "105": "mitte",
  "106": "charlottenburg-wilmersdorf",
  "107": "charlottenburg-wilmersdorf",
  "108": "tempelhof-schoeneberg",
  "109": "friedrichshain-kreuzberg",
  "120": "neukoelln",
  "121": "tempelhof-schoeneberg",
  "122": "steglitz-zehlendorf",
  "123": "steglitz-zehlendorf",
  "124": "treptow-koepenick",
  "125": "treptow-koepenick",
  "126": "marzahn-hellersdorf",
  "130": "treptow-koepenick",
  "131": "pankow",
  "133": "mitte",
  "134": "reinickendorf",
  "135": "spandau",
  "136": "spandau",
  "140": "charlottenburg-wilmersdorf",
  "141": "steglitz-zehlendorf",
};

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

function normalizeWebsite(url) {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeEmail(email) {
  const trimmed = email?.trim();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined;
  return trimmed;
}

function assignCategories(name, category) {
  const text = `${name} ${category}`;
  const matched = METHODS.filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
  if (matched.length === 0) matched.push("naturheilkunde");
  const primary = METHODS.map(([id]) => id).find((id) => matched.includes(id)) ?? "naturheilkunde";
  const secondary = matched.filter((id) => id !== primary);
  return [primary, ...secondary];
}

function assignArea(postalCode) {
  const prefix = (postalCode ?? "").trim().slice(0, 3);
  return PLZ_BEZIRK[prefix] ?? "mitte";
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

function buildDescription(name, categories) {
  const focus =
    categories[0] === "naturheilkunde"
      ? "Naturheilkunde und ganzheitliche Behandlungen"
      : categories[0].replace(/-/g, " ");
  return `${name} ist ein Heilpraktiker in Berlin mit Schwerpunkt ${focus}. Kontakt, Adresse und Öffnungszeiten finden Sie in diesem Verzeichniseintrag.`;
}

function rowToEntry(row, slug) {
  const categories = assignCategories(row.NAME ?? "", row.CATEGORY ?? "");
  const areaId = assignArea(row["ZIP CODE"]);
  const lat = Number.parseFloat(row.LAT);
  const lng = Number.parseFloat(row.LNG);
  const street = (row["STREET ADDRESS"] ?? row.ADDRESS ?? "").split(",")[0]?.trim() || row.ADDRESS;

  const entry = {
    id: slug,
    slug,
    name: (row.NAME ?? "").trim(),
    description: buildDescription((row.NAME ?? "").trim(), categories),
    lastUpdated: TODAY,
    status: "open",
    categories,
    areaIds: [areaId],
    address: {
      street,
      locality: "Berlin",
      region: "Berlin",
      postalCode: (row["ZIP CODE"] ?? "").trim() || undefined,
      country: "DE",
    },
    geo:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng }
        : undefined,
    phone: (row.PHONE ?? "").trim() || undefined,
    email: normalizeEmail(row.EMAIL),
    website: normalizeWebsite(row.WEBSITE),
    bookingUrl: normalizeWebsite(row["BOOKING LINK"]),
    openingHours: [],
    offers: [],
    images: [],
    faq: [],
  };

  return entry;
}

function main() {
  const raw = readFileSync(CSV_PATH, "utf-8").replace(/^\uFEFF/, "");
  const table = parseCsv(raw);
  const headers = table[0];
  const records = table.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );

  if (!existsSync(ENTRIES_DIR)) mkdirSync(ENTRIES_DIR, { recursive: true });

  for (const file of readdirSync(ENTRIES_DIR).filter((f) => f.endsWith(".json"))) {
    unlinkSync(join(ENTRIES_DIR, file));
  }

  const slugCounts = new Map();
  let written = 0;
  let skipped = 0;

  for (const row of records) {
    if (!shouldInclude(row)) {
      skipped += 1;
      continue;
    }

    const base = slugify(row.NAME ?? "heilpraktiker") || "heilpraktiker";
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    const slug =
      count === 0
        ? base
        : `${base}-${(row["PLACE ID"] ?? row.ID ?? String(count)).replace(/[^a-z0-9-]/gi, "").slice(0, 12).toLowerCase()}`;

    const entry = rowToEntry(row, slug);
    writeFileSync(join(ENTRIES_DIR, `${slug}.json`), `${JSON.stringify(entry, null, 2)}\n`);
    written += 1;
  }

  console.log(`Berlin import complete: ${written} entries written, ${skipped} rows skipped.`);
}

main();
