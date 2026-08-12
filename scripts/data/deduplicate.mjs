#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { deduplicateCandidates } from "../lib/deduplicate.mjs";
import { ROOT, ensureWorkDir, writeJson } from "../lib/work-utils.mjs";

const candidatesDir = join(ROOT, "work/staging/candidates");
let candidates = [];
try {
  candidates = readdirSync(candidatesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(candidatesDir, f), "utf-8")));
} catch {
  // Use fixture candidates if none staged
  candidates = JSON.parse(
    readFileSync(join(ROOT, "tests/fixtures/candidates.json"), "utf-8"),
  );
}

const results = deduplicateCandidates(candidates);
writeJson(join(ensureWorkDir("reports"), "duplicates.json"), results);
const dupes = results.filter((r) => r.classification !== "new").length;
console.log(`Deduplicated ${candidates.length} candidates (${dupes} potential duplicates)`);
