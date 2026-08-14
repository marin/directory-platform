#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import siteConfig from "../../config/site.config.ts";
import { buildGroundingContext } from "../../src/lib/data/build-grounding-context.ts";
import { checkGrounding } from "../../src/lib/data/grounding.ts";
import { isBoilerplateDescription, sanitizeDirectoryText, sanitizeFaqItems } from "../../src/lib/data/extract-about.ts";
import { entrySchema, faqItemSchema } from "../../src/lib/validation/entry-schema.ts";
import { loadEnv } from "../lib/load-env.mjs";
import { ROOT, ensureWorkDir, hashFile } from "../lib/work-utils.mjs";
import { chatCompletion } from "./openai-client.mjs";

loadEnv();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const useFixture = !process.env.OPENAI_API_KEY || args.includes("--fixture");
const skipExisting = args.includes("--skip-existing");
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1]
  ?? (args.includes("--limit") ? args[args.indexOf("--limit") + 1] : undefined);
const limit = limitArg ? Number(limitArg) : undefined;
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1]
  ?? (args.includes("--slug") ? args[args.indexOf("--slug") + 1] : undefined);

const SCRAPES_DIR = join(ROOT, "work/scrapes/firecrawl");
const ENTRIES_DIR = join(ROOT, "data/entries");
const STAGING_DIR = ensureWorkDir("staging/enriched");
const DELAY_MS = 500;

function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function loadPrompt(name) {
  return readFileSync(join(ROOT, `config/prompts/${name}.md`), "utf-8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadHomepageBundle(slug) {
  const mdPath = join(SCRAPES_DIR, slug, "homepage.md");
  if (!existsSync(mdPath)) return null;

  const markdown = readFileSync(mdPath, "utf-8");
  const manifestPath = join(SCRAPES_DIR, slug, "manifest.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf-8"))
    : null;
  const extractedPath = join(SCRAPES_DIR, slug, "homepage-extracted.json");
  const extracted = existsSync(extractedPath)
    ? JSON.parse(readFileSync(extractedPath, "utf-8"))
    : null;

  return { markdown, manifest, extracted };
}

function listCandidates() {
  const slugs = slugArg
    ? [slugArg]
    : readdirSync(SCRAPES_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

  const candidates = [];
  for (const slug of slugs) {
    const entryPath = join(ENTRIES_DIR, `${slug}.json`);
    if (!existsSync(entryPath)) continue;

    const entry = entrySchema.parse(JSON.parse(readFileSync(entryPath, "utf-8")));
    if (!isBoilerplateDescription(entry.description)) continue;

    const bundle = loadHomepageBundle(slug);
    if (!bundle) continue;
    if (bundle.extracted?.flags?.spam) continue;
    if (bundle.extracted?.flags?.thin) continue;

    if (skipExisting && existsSync(join(STAGING_DIR, `${slug}.json`))) continue;

    candidates.push({ slug, entry, ...bundle });
  }

  return typeof limit === "number" ? candidates.slice(0, limit) : candidates;
}

const BOILERPLATE_RE =
  /cookie|consent|datenschutz|technische speicherung|rechtmäßigen zweck|abonnenten oder nutzer|akzeptieren|ablehnen|einstellungen speichern/i;

function isUsableExcerptLine(line) {
  if (!line || line.startsWith("#") || line.length < 60) return false;
  if (BOILERPLATE_RE.test(line)) return false;
  if ((line.match(/\]\(/g) ?? []).length > 2) return false;
  return true;
}

function fixtureDescription(context) {
  const excerpt = context.websiteExcerpt
    .split("\n")
    .map((line) => line.trim())
    .filter(isUsableExcerptLine);
  const lead = excerpt[0] ?? `${context.name} bietet naturheilkundliche Behandlungen in Berlin.`;
  return lead.slice(0, 500);
}

function fixtureFaq(context) {
  const offers = context.offers.slice(0, 3).map((offer) => offer.name);
  const faq = [
    {
      question: "Welche Behandlungen werden angeboten?",
      answer:
        offers.length > 0
          ? `Laut Website werden unter anderem ${offers.join(", ")} angeboten.`
          : "Die Website nennt verschiedene naturheilkundliche Behandlungsangebote.",
    },
    {
      question: "Wo befindet sich die Praxis?",
      answer: context.address
        ? `Die Praxis liegt in ${context.address.locality}${context.address.postalCode ? ` (${context.address.postalCode})` : ""}, ${context.address.street}.`
        : "Die Praxis befindet sich in Berlin.",
    },
  ];
  if (context.bookingUrl) {
    faq.push({
      question: "Wie kann ich einen Termin vereinbaren?",
      answer: "Termine können über die auf der Website verlinkte Kontakt- oder Buchungsseite angefragt werden.",
    });
  }
  return faq;
}

async function generateDescription(context, promptTemplate) {
  if (useFixture) return fixtureDescription(context);

  const prompt = renderTemplate(promptTemplate, {
    entrySingular: siteConfig.directory.entrySingular,
    locality: siteConfig.geography.locality,
    region: siteConfig.geography.region,
    listingJson: JSON.stringify(context, null, 2),
    websiteExcerpt: context.websiteExcerpt,
  });

  return (await chatCompletion({
    system: "Du schreibst sachliche Verzeichnistexte für Heilpraktiker in Deutschland.",
    user: prompt,
  })).trim();
}

async function generateFaq(context, promptTemplate) {
  if (useFixture) return fixtureFaq(context);

  const prompt = renderTemplate(promptTemplate, {
    contextJson: JSON.stringify(context, null, 2),
  });

  const raw = await chatCompletion({
    system: "Du erstellst FAQ-Inhalte für ein Heilpraktiker-Verzeichnis.",
    user: prompt,
    json: true,
  });

  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : parsed.faq;
  if (!Array.isArray(items)) {
    throw new Error("FAQ response is not an array");
  }

  return items.map((item) => faqItemSchema.parse(item));
}

const descriptionPrompt = loadPrompt("description");
const faqPrompt = loadPrompt("faq");
const descriptionPromptHash = hashFile(join(ROOT, "config/prompts/description.md"));
const faqPromptHash = hashFile(join(ROOT, "config/prompts/faq.md"));

const candidates = listCandidates();
console.log(
  `Enrichment candidates: ${candidates.length}` +
    (useFixture ? " (fixture mode)" : "") +
    (dryRun ? " (dry-run)" : ""),
);

if (dryRun) {
  for (const job of candidates.slice(0, 20)) {
    console.log(`  ${job.slug}`);
  }
  if (candidates.length > 20) console.log(`  ... and ${candidates.length - 20} more`);
  process.exit(0);
}

if (!args.includes("--yes") && !useFixture) {
  console.error("Usage: data:generate:enrichment -- --yes [--limit N] [--slug <slug>] [--fixture] [--dry-run]");
  process.exit(1);
}

let ok = 0;
let fail = 0;
const summary = [];

for (let i = 0; i < candidates.length; i += 1) {
  const job = candidates[i];
  const n = i + 1;

  try {
    const context = buildGroundingContext(job.entry, {
      markdown: job.markdown,
      extracted: job.extracted,
      manifest: job.manifest,
    });

    const description = sanitizeDirectoryText(
      await generateDescription(context, descriptionPrompt),
    );
    if (!description) {
      throw new Error("description empty after sanitizing website pointers");
    }
    const descriptionGrounding = checkGrounding(description, context);
    if (!descriptionGrounding.passed) {
      throw new Error(`description grounding failed: ${descriptionGrounding.violations.join("; ")}`);
    }

    const faq = sanitizeFaqItems(await generateFaq(context, faqPrompt));
    const faqText = faq.map((item) => `${item.question} ${item.answer}`).join("\n");
    const faqGrounding = checkGrounding(faqText, context);
    if (!faqGrounding.passed) {
      throw new Error(`faq grounding failed: ${faqGrounding.violations.join("; ")}`);
    }

    const enriched = {
      ...job.entry,
      description,
      faq,
    };

    entrySchema.parse(enriched);
    writeFileSync(join(STAGING_DIR, `${job.slug}.json`), JSON.stringify(enriched, null, 2) + "\n");
    writeFileSync(
      join(STAGING_DIR, `${job.slug}.meta.json`),
      JSON.stringify(
        {
          slug: job.slug,
          generatedAt: new Date().toISOString(),
          descriptionPromptHash,
          faqPromptHash,
          mode: useFixture ? "fixture" : "openai",
          websiteUrl: context.websiteUrl,
        },
        null,
        2,
      ) + "\n",
    );

    ok += 1;
    summary.push({ slug: job.slug, status: "ok", faq: faq.length, descriptionLength: description.length });
    console.log(`[${n}/${candidates.length}] ok  ${job.slug} (${description.length} chars, ${faq.length} faq)`);
  } catch (err) {
    fail += 1;
    console.error(`[${n}/${candidates.length}] FAIL ${job.slug}: ${err.message ?? err}`);
    summary.push({ slug: job.slug, status: "fail", error: String(err.message ?? err) });
  }

  if (i < candidates.length - 1 && !useFixture) {
    await sleep(DELAY_MS);
  }
}

const reportPath = join(ROOT, "work/scrapes/enrichment-generate-report.json");
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      ok,
      fail,
      mode: useFixture ? "fixture" : "openai",
      summary,
    },
    null,
    2,
  ) + "\n",
);

console.log("");
console.log(`Done: ${ok} succeeded, ${fail} failed`);
console.log(`Staging: ${STAGING_DIR}`);
console.log(`Report: ${reportPath}`);

process.exit(fail > 0 ? 1 : 0);
