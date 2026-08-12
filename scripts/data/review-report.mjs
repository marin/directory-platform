#!/usr/bin/env node
import { runReviewReport } from "../lib/review.mjs";

const args = process.argv.slice(2);
const slug = args.includes("--all") ? undefined : args[args.indexOf("--slug") + 1];
const reports = runReviewReport(slug);
for (const r of reports) {
  console.log(`${r.slug}: ${r.queue} — ${r.reasons.join(", ") || "ok"}`);
}
