#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, ensureWorkDir } from "../../lib/work-utils.mjs";

const args = process.argv.slice(2);
const runId = args[args.indexOf("--run") + 1] ?? "fixture-run";
const useFixture = !process.env.LOBSTR_API_KEY || args.includes("--fixture");

async function pullLobstr() {
  const outDir = ensureWorkDir("imports/lobstr");
  if (useFixture) {
    const fixture = JSON.parse(
      readFileSync(join(ROOT, "tests/fixtures/lobstr/run-response.json"), "utf-8"),
    );
    const outPath = join(outDir, `${runId}.json`);
    writeFileSync(outPath, JSON.stringify(fixture, null, 2) + "\n");
    console.log(`Saved fixture import: ${fixture.results?.length ?? 0} records → ${outPath}`);
    return;
  }
  const apiKey = process.env.LOBSTR_API_KEY;
  const res = await fetch(`https://api.lobstr.io/v1/results?run=${runId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Lobstr API error: ${res.status}`);
  const data = await res.json();
  writeFileSync(join(outDir, `${runId}.json`), JSON.stringify(data, null, 2) + "\n");
  console.log(`Pulled ${data.results?.length ?? 0} records`);
}

pullLobstr().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
