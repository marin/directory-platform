#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../../src/lib/validation/entry-schema.ts";
import {
  loadImageManifest,
  prepareEntryImages,
  saveImageManifest,
} from "../../src/lib/media/prepare-entry-images.ts";
import { ROOT } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const slugArg =
  args.find((arg) => arg.startsWith("--slug="))?.split("=")[1] ??
  (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

const ENTRIES_DIR = join(ROOT, "data/entries");
const PUBLIC_DIR = join(ROOT, "public");
const MANIFEST_PATH = join(ROOT, "data/image-manifest.json");

const slugs = slugArg
  ? [slugArg]
  : readdirSync(ENTRIES_DIR).filter((file) => file.endsWith(".json")).map((file) => file.replace(/\.json$/, ""));

const manifest = loadImageManifest(MANIFEST_PATH);

let updated = 0;
let skipped = 0;
let warnings = 0;
const report = [];

for (const slug of slugs) {
  const entryPath = join(ENTRIES_DIR, `${slug}.json`);
  if (!existsSync(entryPath)) {
    report.push({ slug, status: "missing_entry" });
    continue;
  }

  const current = entrySchema.parse(JSON.parse(readFileSync(entryPath, "utf-8")));
  if ((current.images ?? []).length === 0) {
    skipped += 1;
    report.push({ slug, status: "skipped_no_images" });
    continue;
  }

  const result = await prepareEntryImages({
    slug,
    images: current.images ?? [],
    publicDir: PUBLIC_DIR,
    manifest,
    dryRun,
  });

  if (result.warnings.length > 0) {
    warnings += result.warnings.length;
    for (const warning of result.warnings) {
      console.warn(warning);
    }
  }

  if (!result.changed && result.images.length === (current.images ?? []).length) {
    skipped += 1;
    report.push({ slug, status: "skipped_no_changes", imageCount: result.images.length });
    manifest[slug] = result.manifestEntries;
    continue;
  }

  if (!dryRun) {
    const next = { ...current, images: result.images };
    writeFileSync(entryPath, `${JSON.stringify(next, null, 2)}\n`);
    manifest[slug] = result.manifestEntries;
  }

  updated += 1;
  report.push({
    slug,
    status: dryRun ? "would_update" : "updated",
    imageCount: result.images.length,
  });
}

if (!dryRun) {
  saveImageManifest(MANIFEST_PATH, manifest);
}

console.log(
  JSON.stringify(
    {
      dryRun,
      processed: slugs.length,
      updated,
      skipped,
      warnings,
      report: report.slice(0, 20),
    },
    null,
    2,
  ),
);
