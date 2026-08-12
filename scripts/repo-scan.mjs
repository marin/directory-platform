#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BLOCKED_PATTERNS = [
  /massageasoke/i,
  /massage-asoke/i,
  /\/Users\/[^/\s]+/,
  /sk-[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
];
const SCAN_DIRS = ["src", "scripts", "config", "data", "tests", "public", ".github"];
const SCAN_FILES = ["package.json", "README.md", "astro.config.mjs"];

function scanFile(filePath) {
  const rel = filePath.replace(ROOT + "/", "");
  if (rel === "scripts/repo-scan.mjs") return null;
  const content = readFileSync(filePath, "utf-8");
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return `Blocked pattern ${pattern} in ${rel}`;
    }
  }
  return null;
}

function walk(dir) {
  const errors = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === "dist" || entry === "work" || entry === ".git")
      continue;
    const st = statSync(full);
    if (st.isDirectory()) errors.push(...walk(full));
    else if (/\.(ts|js|mjs|json|md|astro|yml|yaml)$/.test(entry)) {
      const err = scanFile(full);
      if (err) errors.push(err);
    }
  }
  return errors;
}

const errors = [];
for (const f of SCAN_FILES) {
  const err = scanFile(join(ROOT, f));
  if (err) errors.push(err);
}
for (const d of SCAN_DIRS) {
  const full = join(ROOT, d);
  try {
    errors.push(...walk(full));
  } catch {
    // dir may not exist yet
  }
}

if (errors.length > 0) {
  console.error("Repo scan failed:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("Repo scan passed.");
