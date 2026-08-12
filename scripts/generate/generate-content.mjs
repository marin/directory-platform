#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, ensureWorkDir, hashFile } from "../lib/work-utils.mjs";

const args = process.argv.slice(2);
const type = args[args.indexOf("--type") + 1] ?? "description";
const slug = args[args.indexOf("--slug") + 1];
const id = args[args.indexOf("--id") + 1];
const useFixture = !process.env.OPENAI_API_KEY || args.includes("--fixture");

const promptPath = join(ROOT, `config/prompts/${type === "faq" ? "faq" : type.replace("-intro", "-intro")}.md`);
const promptTemplate = existsSync(promptPath)
  ? readFileSync(promptPath, "utf-8")
  : "Generate content from: {{listingJson}}";
const promptHash = hashFile(promptPath);

function generateFromFixture(inputData) {
  const fixturePath = join(ROOT, `tests/fixtures/generation/${type}.json`);
  if (existsSync(fixturePath)) {
    return JSON.parse(readFileSync(fixturePath, "utf-8"));
  }
  if (type === "description") {
    return { text: `${inputData.name ?? "Provider"} offers services in Austin with transparent pricing.` };
  }
  if (type === "category-intro" || type === "area-intro") {
    return { intro: `This collection includes ${inputData.listingCount ?? 0} open providers.` };
  }
  return { faq: [{ question: "How many providers?", answer: `${inputData.listingCount ?? 0} providers.` }] };
}

async function generate() {
  let inputData = {};
  if (slug) {
    const path = join(ROOT, `work/staging/enriched/${slug}.json`);
    inputData = existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : { slug };
  }

  const output = useFixture
    ? generateFromFixture(inputData)
    : (() => { throw new Error("Live generation requires OPENAI_API_KEY — use --fixture"); })();

  const outDir = ensureWorkDir("generated", type);
  const key = slug ?? id ?? "batch";
  writeFileSync(
    join(outDir, `${key}.json`),
    JSON.stringify({ ...output, promptHash, type, slug: key }, null, 2) + "\n",
  );
  console.log(`Generated ${type} for ${key}`);
}

if (args.includes("--batch")) {
  const batchDir = args[args.indexOf("--batch") + 1];
  const files = readdirSync(join(ROOT, batchDir)).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const s = f.replace(".json", "");
    process.argv.push("--slug", s);
    await generate();
  }
} else {
  await generate();
}
