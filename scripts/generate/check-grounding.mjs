#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { checkGrounding } from "../../src/lib/data/grounding.ts";
import { ROOT, ensureWorkDir, writeJson } from "../lib/work-utils.mjs";

const violations = [];
const genDir = join(ROOT, "work/generated");
if (existsSync(genDir)) {
  for (const type of readdirSync(genDir)) {
    const typeDir = join(genDir, type);
    for (const file of readdirSync(typeDir).filter((f) => f.endsWith(".json"))) {
      const gen = JSON.parse(readFileSync(join(typeDir, file), "utf-8"));
      const slug = gen.slug ?? file.replace(".json", "");
      const inputPath = join(ROOT, `work/staging/enriched/${slug}.json`);
      const input = existsSync(inputPath)
        ? JSON.parse(readFileSync(inputPath, "utf-8"))
        : {};
      const text = gen.text ?? gen.intro ?? JSON.stringify(gen.faq ?? "");
      const result = checkGrounding(text, input);
      if (!result.passed) {
        violations.push({ slug, type, violations: result.violations });
      }
    }
  }
}
writeJson(join(ensureWorkDir("reports"), "grounding-violations.json"), violations);
console.log(violations.length === 0
  ? "No grounding violations"
  : `Found ${violations.length} grounding violations`);
