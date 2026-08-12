import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadDataset } from "../../src/lib/data/load-dataset.ts";
import { buildLlmsTxt } from "../../src/lib/geo/llms.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const DIST = join(ROOT, "dist");

function readDist(path: string): string {
  return readFileSync(join(DIST, path), "utf-8");
}

function listHtmlFiles(): string[] {
  const files: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".html")) files.push(p);
    }
  }
  if (existsSync(DIST)) walk(DIST);
  return files;
}

describe("generated site", () => {
  beforeAll(() => {
    if (!existsSync(DIST)) {
      throw new Error("Run npm run build before generated-site tests");
    }
  });

  it("builds listing pages with facts in HTML", () => {
    const html = readDist("provider/austin-wellness-massage/index.html");
    expect(html).toContain("Austin Wellness Massage");
    expect(html).toContain('data-testid="entry-description"');
    expect(html).toContain('data-testid="nap-name"');
    expect(html).toContain('data-testid="nap-phone"');
    expect(html).toContain('data-testid="nap-address"');
  });

  it("renders closed notice", () => {
    const html = readDist("provider/closed-downtown-spa/index.html");
    expect(html).toContain("Permanently closed");
  });

  it("includes aggregate facts on category pages", () => {
    const html = readDist("category/wellness-massage/index.html");
    expect(html).toContain('data-testid="aggregate-facts"');
  });

  it("has NAP consistency between HTML and JSON-LD", () => {
    const html = readDist("provider/austin-wellness-massage/index.html");
    const nameMatch = html.match(/data-testid="nap-name"[^>]*>([^<]+)</);
    const ldMatch = html.match(/"name":"([^"]+)"/);
    expect(nameMatch?.[1]).toBeTruthy();
    expect(ldMatch?.[1]).toBe(nameMatch?.[1]);
  });

  it("generates sufficient routes", () => {
    const files = listHtmlFiles();
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  it("llms.txt is consistent with dataset", () => {
    const dataset = loadDataset();
    const llms = buildLlmsTxt(dataset);
    expect(llms).toContain("Example Directory");
    expect(llms).toContain("wellness-massage");
  });
});
