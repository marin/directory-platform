import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { checkGrounding } from "../../src/lib/data/grounding.ts";
import { findSimilarPairs } from "../../src/lib/data/uniqueness.ts";
import siteConfig from "../../config/site.config.ts";
import { ROOT, ensureWorkDir, readJson, writeJson, listJsonFiles } from "./work-utils.mjs";

export function classifyForReview(proposal, options = {}) {
  const {
    isNew = true,
    groundingViolations = [],
    uniquenessFlagged = false,
    dedupNeedsReview = false,
  } = options;
  const reasons = [];

  if (!isNew) reasons.push("change to published listing");
  if (dedupNeedsReview) reasons.push("dedup ambiguity");
  if (groundingViolations.length > 0) reasons.push("grounding violations");
  if (uniquenessFlagged) reasons.push("uniqueness flag");

  const q = siteConfig.quality.autoApprove;
  if (q.requireDescription && !proposal.description?.trim()) {
    reasons.push("missing description");
  }
  if (q.requireCategory && (!proposal.categories || proposal.categories.length === 0)) {
    reasons.push("missing category");
  }
  if (
    q.requireContactOrLocation &&
    !proposal.phone &&
    !proposal.address &&
    !proposal.website
  ) {
    reasons.push("missing contact or location");
  }

  const autoApprove =
    isNew &&
    reasons.length === 0 &&
    siteConfig.quality.autoApprove.enabled;

  return { queue: autoApprove ? "auto" : "human", reasons };
}

export function runReviewReport(slug) {
  const stagingDir = join(ROOT, "work/staging/enriched");
  const files = slug ? [`${slug}.json`] : listJsonFiles(stagingDir);
  const reports = [];

  for (const file of files) {
    const path = join(stagingDir, file);
    if (!existsSync(path)) continue;
    const proposal = readJson(path);
    const publishedPath = join(ROOT, `data/entries/${proposal.slug ?? slug}.json`);
    const isNew = !existsSync(publishedPath);
    const generatedPath = join(ROOT, `work/generated/description/${proposal.slug ?? slug}.json`);
    let groundingViolations = [];
    if (existsSync(generatedPath)) {
      const gen = readJson(generatedPath);
      const result = checkGrounding(gen.text ?? gen.description ?? "", proposal);
      groundingViolations = result.violations;
    }
    const classification = classifyForReview(proposal, { isNew, groundingViolations });
    reports.push({ slug: proposal.slug ?? slug, ...classification, groundingViolations });
  }
  writeJson(join(ensureWorkDir("reports"), "review-report.json"), reports);
  return reports;
}
