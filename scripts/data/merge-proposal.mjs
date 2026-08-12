#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { mergeProposal, formatDiff } from "../../src/lib/data/merge.ts";
import { ROOT, ensureWorkDir } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const slug = args[args.indexOf("--slug") + 1];
if (!slug) {
  console.error("Usage: data:merge -- --slug <slug>");
  process.exit(1);
}

const candidatePath = join(ROOT, `work/staging/candidates/${slug}.json`);
const scrapePath = join(ROOT, `work/scrapes/firecrawl/${slug}/homepage.json`);
const publishedPath = join(ROOT, `data/entries/${slug}.json`);

const discovered = existsSync(candidatePath)
  ? JSON.parse(readFileSync(candidatePath, "utf-8"))
  : {};
const extracted = existsSync(scrapePath)
  ? JSON.parse(readFileSync(scrapePath, "utf-8")).extracted ?? {}
  : {};
const current = existsSync(publishedPath)
  ? JSON.parse(readFileSync(publishedPath, "utf-8"))
  : undefined;

const { merged, diff } = mergeProposal(current, discovered, extracted);
const proposal = { slug, ...merged };
const outPath = join(ensureWorkDir("staging/enriched"), `${slug}.json`);
writeFileSync(outPath, JSON.stringify(proposal, null, 2) + "\n");
console.log(formatDiff(proposal.name ?? slug, diff) || `Merged proposal saved: ${outPath}`);
