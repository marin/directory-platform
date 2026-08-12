#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, ensureWorkDir } from "../../lib/work-utils.mjs";

const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1];
if (!input) {
  console.error("Usage: data:lobstr:import -- --input <file>");
  process.exit(1);
}

const content = readFileSync(input, "utf-8");
let data;
if (input.endsWith(".json") || input.endsWith(".jsonl")) {
  data = input.endsWith(".jsonl")
    ? content.trim().split("\n").map((l) => JSON.parse(l))
    : JSON.parse(content);
} else {
  // Simple CSV: name,address,phone,website
  const lines = content.trim().split("\n").slice(1);
  data = lines.map((line, i) => {
    const [name, address, phone, website] = line.split(",");
    return { id: `import-${i}`, name, address, phone, website };
  });
}

const runId = `import-${Date.now()}`;
writeFileSync(
  join(ensureWorkDir("imports/lobstr"), `${runId}.json`),
  JSON.stringify({ runId, results: Array.isArray(data) ? data : [data] }, null, 2) + "\n",
);
console.log(`Imported ${Array.isArray(data) ? data.length : 1} records as ${runId}`);
