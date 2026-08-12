#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { entrySchema } from "../src/lib/validation/entry-schema.ts";
import { hasSubstantiveChange, resolveLastUpdated } from "../src/lib/freshness/substantive-change.ts";
import { ROOT, ensureWorkDir, readJson, writeJson } from "./lib/work-utils.mjs";

const args = process.argv.slice(2);
const isBatch = args[0] === "--batch" || args.includes("--batch");
const slug = isBatch ? undefined : args.find((a) => !a.startsWith("--"));
const approvedFile = args.find((a) => a.startsWith("--approved="))?.split("=")[1]
  ?? (args.includes("--approved") ? args[args.indexOf("--approved") + 1] : undefined);

function publishOne(entrySlug) {
  const stagingPath = join(ROOT, `work/staging/enriched/${entrySlug}.json`);
  const approvedPath = join(ROOT, `work/staging/approved/${entrySlug}.json`);
  const sourcePath = existsSync(approvedPath) ? approvedPath : stagingPath;
  if (!existsSync(sourcePath)) {
    throw new Error(`No staging proposal for ${entrySlug}`);
  }
  const proposed = entrySchema.parse(readJson(sourcePath));
  const publishedPath = join(ROOT, `data/entries/${entrySlug}.json`);
  let current;
  if (existsSync(publishedPath)) {
    current = entrySchema.parse(readJson(publishedPath));
  }
  const substantive = hasSubstantiveChange(current, proposed);
  const final = {
    ...proposed,
    lastUpdated: resolveLastUpdated(current, proposed, substantive),
  };
  return { slug: entrySlug, entry: final, substantive, publishedPath };
}

function atomicBatchPublish(slugs) {
  const batchId = Date.now().toString();
  const stagingDir = ensureWorkDir(".publish-staging", batchId);
  const prepared = [];

  for (const s of slugs) {
    const result = publishOne(s);
    const tempPath = join(stagingDir, `${s}.json`);
    writeJson(tempPath, result.entry);
    prepared.push({ ...result, tempPath });
  }

  // Validate entire batch before committing
  for (const item of prepared) {
    entrySchema.parse(readJson(item.tempPath));
  }

  const manifest = [];
  try {
    for (const item of prepared) {
      writeFileSync(item.publishedPath, readFileSync(item.tempPath));
      manifest.push({ slug: item.slug, substantive: item.substantive });
    }
  } catch (err) {
    writeJson(join(stagingDir, "recovery-manifest.json"), { prepared: manifest, error: String(err) });
    throw err;
  } finally {
    rmSync(join(ROOT, "work/.publish-staging", batchId), { recursive: true, force: true });
  }
  return manifest;
}

try {
  if (isBatch && approvedFile) {
    const slugs = readFileSync(join(ROOT, approvedFile), "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const manifest = atomicBatchPublish(slugs);
    console.log(`Published ${manifest.length} entries`);
  } else if (slug) {
    const [result] = atomicBatchPublish([slug]);
    console.log(`Published ${result.slug}${result.substantive ? " (substantive change)" : ""}`);
  } else {
    console.error("Usage: entry:publish <slug> | entries:publish --approved <file>");
    process.exit(1);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
