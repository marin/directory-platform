#!/usr/bin/env node
import siteConfig from "../config/site.config.ts";

const args = process.argv.slice(2);
if (!siteConfig.features.indexNowPing) {
  console.log("IndexNow disabled (features.indexNowPing = false)");
  process.exit(0);
}

const key = process.env.INDEXNOW_KEY;
const host = process.env.INDEXNOW_HOST ?? new URL(siteConfig.site.origin).host;
if (!key) {
  console.warn("INDEXNOW_KEY not set — skipping notification");
  process.exit(0);
}

const changedUrls = args.length > 0 ? args : [siteConfig.site.origin];
console.log(`Would notify IndexNow for ${changedUrls.length} URLs on ${host}`);
// Mocked — no network call in default mode
console.warn("IndexNow notification skipped (mock mode)");
