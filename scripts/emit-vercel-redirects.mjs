#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const redirectsPath = join(ROOT, "data/redirects.json");
const vercelPath = join(ROOT, "vercel.json");

let redirects = [];
try {
  redirects = JSON.parse(readFileSync(redirectsPath, "utf-8"));
} catch {
  redirects = [];
}

const vercelConfig = {
  redirects: redirects.map((r) => ({
    source: r.from,
    destination: r.to,
    permanent: (r.status ?? 301) === 301,
  })),
};

writeFileSync(vercelPath, JSON.stringify(vercelConfig, null, 2) + "\n");
console.log(`Wrote ${vercelConfig.redirects.length} redirects to vercel.json`);
