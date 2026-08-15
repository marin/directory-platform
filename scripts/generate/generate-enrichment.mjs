#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import siteConfig from "../../config/site.config.ts";
import { buildGroundingContext } from "../../src/lib/data/build-grounding-context.ts";
import { checkGrounding } from "../../src/lib/data/grounding.ts";
import {
  dropNapFaqItems,
  isBoilerplateDescription,
  sanitizeDirectoryText,
  sanitizeFaqItems,
} from "../../src/lib/data/extract-about.ts";
import { buildFixtureFaq, extractFaqTopics, keepTopicFaqs } from "../../src/lib/data/extract-faq-topics.ts";
import { entrySchema, faqItemSchema } from "../../src/lib/validation/entry-schema.ts";
import { loadEnv } from "../lib/load-env.mjs";
import { ROOT, ensureWorkDir, hashFile } from "../lib/work-utils.mjs";
import { chatCompletion } from "./openai-client.mjs";

loadEnv();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const faqOnly = args.includes("--faq-only");
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

function loadScrapeBundle(slug) {
  const parts = [];
  for (const file of ["homepage.md", "about.md", "prices.md"]) {
    const path = join(SCRAPES_DIR, slug, file);
    if (existsSync(path)) parts.push(readFileSync(path, "utf-8"));
  }
  if (!parts.length) return null;

  const homepage = loadHomepageBundle(slug);
  return {
    markdown: parts.join("\n\n"),
    manifest: homepage?.manifest ?? null,
    extracted: homepage?.extracted ?? null,
  };
}

function listDescriptionCandidates() {
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

function listFaqOnlyCandidates() {
  const files = slugArg
    ? [`${slugArg}.json`]
    : readdirSync(ENTRIES_DIR).filter((file) => file.endsWith(".json"));

  const candidates = [];
  for (const file of files) {
    const entry = entrySchema.parse(JSON.parse(readFileSync(join(ENTRIES_DIR, file), "utf-8")));
    if (skipExisting && existsSync(join(STAGING_DIR, `${entry.slug}.json`))) continue;

    const bundle = loadScrapeBundle(entry.slug);
    if (bundle?.extracted?.flags?.spam) {
      candidates.push({ slug: entry.slug, entry, markdown: null, manifest: null, extracted: null });
      continue;
    }

    candidates.push({
      slug: entry.slug,
      entry,
      markdown: bundle?.markdown ?? null,
      manifest: bundle?.manifest ?? null,
      extracted: bundle?.extracted ?? null,
    });
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

function topicsForEntry(entry, markdown) {
  return extractFaqTopics({
    markdown: markdown ?? "",
    description: entry.description,
    offers: entry.offers,
  });
}

function finalizeFaq(items, topics = []) {
  const allowed = topics.map((topic) => topic.topic);
  return keepTopicFaqs(dropNapFaqItems(sanitizeFaqItems(items)), allowed);
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

async function generateFaq(topics, promptTemplate, name) {
  if (!topics.length) return [];
  if (useFixture) return buildFixtureFaq(topics);

  const prompt = renderTemplate(promptTemplate, {
    name,
    topicsJson: JSON.stringify(topics, null, 2),
  });

  const raw = await chatCompletion({
    system: "Du erstellst FAQ-Inhalte für ein Heilpraktiker-Verzeichnis. Nur Fakten aus den Belegen.",
    user: prompt,
    json: true,
  });

  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : parsed.faq;
  if (!Array.isArray(items)) {
    throw new Error("FAQ response is not an array");
  }

  return items
    .filter((item) => item?.question?.trim() && item?.answer?.trim())
    .map((item) =>
      faqItemSchema.parse({
        question: String(item.question).trim(),
        answer: String(item.answer).trim(),
      }),
    );
}

function writeStaging(entry, extras, meta) {
  const enriched = { ...entry, ...extras };
  entrySchema.parse(enriched);
  writeFileSync(join(STAGING_DIR, `${entry.slug}.json`), JSON.stringify(enriched, null, 2) + "\n");
  writeFileSync(join(STAGING_DIR, `${entry.slug}.meta.json`), JSON.stringify(meta, null, 2) + "\n");
}

const descriptionPrompt = loadPrompt("description");
const faqPrompt = loadPrompt("faq");
const descriptionPromptHash = hashFile(join(ROOT, "config/prompts/description.md"));
const faqPromptHash = hashFile(join(ROOT, "config/prompts/faq.md"));

const candidates = faqOnly ? listFaqOnlyCandidates() : listDescriptionCandidates();
console.log(
  `Enrichment candidates: ${candidates.length}` +
    (faqOnly ? " (faq-only)" : "") +
    (useFixture ? " (fixture mode)" : "") +
    (dryRun ? " (dry-run)" : ""),
);

if (dryRun) {
  for (const job of candidates.slice(0, 20)) {
    const topics = job.markdown ? topicsForEntry(job.entry, job.markdown) : [];
    const mode = job.markdown ? (topics.length ? topics.map((t) => t.topic).join(",") : "empty") : "nap-strip";
    console.log(`  ${job.slug}  ${mode}`);
  }
  if (candidates.length > 20) console.log(`  ... and ${candidates.length - 20} more`);
  process.exit(0);
}

if (!args.includes("--yes") && !useFixture) {
  console.error("Usage: data:generate:enrichment -- --yes [--faq-only] [--limit N] [--slug <slug>] [--fixture] [--dry-run]");
  process.exit(1);
}

let ok = 0;
let fail = 0;
const summary = [];

for (let i = 0; i < candidates.length; i += 1) {
  const job = candidates[i];
  const n = i + 1;

  try {
    if (faqOnly) {
      const topics = job.markdown ? topicsForEntry(job.entry, job.markdown) : [];
      let faq;
      let faqMode;

      if (!job.markdown) {
        faq = dropNapFaqItems(sanitizeFaqItems(job.entry.faq ?? []));
        faqMode = "nap-strip";
      } else if (!topics.length) {
        faq = [];
        faqMode = "topics-empty";
      } else {
        faq = finalizeFaq(await generateFaq(topics, faqPrompt, job.entry.name), topics);
        const faqText = faq.map((item) => `${item.question} ${item.answer}`).join("\n");
        const faqGrounding = checkGrounding(faqText, { topics, offers: job.entry.offers ?? [] });
        if (!faqGrounding.passed) {
          throw new Error(`faq grounding failed: ${faqGrounding.violations.join("; ")}`);
        }
        faqMode = useFixture ? "fixture" : "openai";
      }

      writeStaging(
        job.entry,
        { faq },
        {
          slug: job.slug,
          generatedAt: new Date().toISOString(),
          faqPromptHash,
          mode: faqMode,
          topics: topics.map((topic) => topic.topic),
          websiteUrl: job.manifest?.url ?? job.entry.website,
        },
      );

      ok += 1;
      summary.push({ slug: job.slug, status: "ok", faq: faq.length, faqMode, topics: topics.map((t) => t.topic) });
      console.log(`[${n}/${candidates.length}] ok  ${job.slug} (${faqMode}, ${faq.length} faq)`);
      if (faqMode === "openai" && i < candidates.length - 1) {
        await sleep(DELAY_MS);
      }
      continue;
    } else {
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

      const topics = topicsForEntry(job.entry, job.markdown);
      const faq = finalizeFaq(await generateFaq(topics, faqPrompt, job.entry.name), topics);
      if (faq.length) {
        const faqText = faq.map((item) => `${item.question} ${item.answer}`).join("\n");
        const faqGrounding = checkGrounding(faqText, { topics, offers: job.entry.offers ?? [] });
        if (!faqGrounding.passed) {
          throw new Error(`faq grounding failed: ${faqGrounding.violations.join("; ")}`);
        }
      }

      writeStaging(
        job.entry,
        { description, faq },
        {
          slug: job.slug,
          generatedAt: new Date().toISOString(),
          descriptionPromptHash,
          faqPromptHash,
          mode: useFixture ? "fixture" : "openai",
          websiteUrl: context.websiteUrl,
        },
      );

      ok += 1;
      summary.push({ slug: job.slug, status: "ok", faq: faq.length, descriptionLength: description.length });
      console.log(`[${n}/${candidates.length}] ok  ${job.slug} (${description.length} chars, ${faq.length} faq)`);
    }
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
      faqOnly,
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
