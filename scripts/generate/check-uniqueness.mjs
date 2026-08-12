#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { findSimilarPairs } from "../../src/lib/data/uniqueness.ts";
import siteConfig from "../../config/site.config.ts";
import { ROOT, ensureWorkDir, writeJson } from "../lib/work-utils.mjs";

const texts = [];
const genDir = join(ROOT, "work/generated/description");
if (existsSync(genDir)) {
  for (const file of readdirSync(genDir).filter((f) => f.endsWith(".json"))) {
    const gen = JSON.parse(readFileSync(join(genDir, file), "utf-8"));
    texts.push({ id: file.replace(".json", ""), text: gen.text ?? "" });
  }
}
const pairs = findSimilarPairs(texts, siteConfig.quality.uniquenessThreshold);
writeJson(join(ensureWorkDir("reports"), "uniqueness.json"), pairs);
console.log(pairs.length === 0 ? "No similarity flags" : `Found ${pairs.length} similar pairs`);
