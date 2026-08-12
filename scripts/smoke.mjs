#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import siteConfig from "../config/site.config.ts";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");

function checkDist() {
  if (!existsSync(DIST)) {
    console.error("dist/ not found — run npm run build first");
    process.exit(1);
  }
  const htmlFiles = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".html")) htmlFiles.push(p);
    }
  }
  walk(DIST);
  if (htmlFiles.length < 5) {
    console.error(`Expected at least 5 HTML files, found ${htmlFiles.length}`);
    process.exit(1);
  }
  const indexPath = join(DIST, "index.html");
  if (!existsSync(indexPath)) {
    console.error("dist/index.html missing");
    process.exit(1);
  }
  const indexHtml = readFileSync(indexPath, "utf-8");
  if (!indexHtml.includes(siteConfig.site.name)) {
    console.error(`Homepage missing site name (${siteConfig.site.name})`);
    process.exit(1);
  }
  console.log(`Smoke passed: ${htmlFiles.length} HTML files`);
}

checkDist();
