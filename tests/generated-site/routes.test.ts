import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import siteConfig from "../../config/site.config.ts";
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
  const dataset = loadDataset();
  const sampleEntry = dataset.entries.find((entry) => entry.isOpen);
  const sampleCategory = dataset.categories[0];
  const closedEntry = dataset.entries.find((entry) => !entry.isOpen);

  beforeAll(() => {
    if (!existsSync(DIST)) {
      throw new Error("Run npm run build before generated-site tests");
    }
    if (!sampleEntry) {
      throw new Error("Expected at least one open entry in dataset");
    }
  });

  it("builds listing pages with facts in HTML", () => {
    const html = readDist(`${siteConfig.directory.entryRoute}/${sampleEntry!.slug}/index.html`);
    expect(html).toContain(sampleEntry!.name);
    expect(html).toContain('data-testid="entry-description"');
    expect(html).toContain('data-testid="nap-name"');
    expect(html).toContain('data-testid="nap-phone"');
    expect(html).toContain('data-testid="nap-address"');
    expect(html).toContain('data-testid="breadcrumbs"');
    expect(html).toContain('data-testid="entry-tags"');
    expect(html).toContain('data-testid="aggregate-facts"');
  });

  it("renders all category tags for multi-category entries", () => {
    const multiCategoryEntry = dataset.entries.find((entry) => entry.categories.length >= 2);
    if (!multiCategoryEntry) return;

    const html = readDist(
      `${siteConfig.directory.entryRoute}/${multiCategoryEntry.slug}/index.html`,
    );
    for (const id of multiCategoryEntry.categories) {
      const category = dataset.categories.find((c) => c.id === id);
      expect(category).toBeDefined();
      expect(html).toContain(`/category/${category!.slug}`);
    }
    const linkCount = (html.match(/data-testid="entry-category-link"/g) ?? []).length;
    expect(linkCount).toBe(multiCategoryEntry.categories.length);
  });

  it("renders booking CTA when bookingUrl is set", () => {
    const entryWithBooking = dataset.entries.find(
      (entry) => entry.isOpen && entry.bookingUrl,
    );
    if (!entryWithBooking) return;
    const html = readDist(
      `${siteConfig.directory.entryRoute}/${entryWithBooking.slug}/index.html`,
    );
    expect(html).toContain('data-testid="cta-booking"');
    expect(html).toContain(entryWithBooking.bookingUrl);
  });

  it("renders closed notice when closed entries exist", () => {
    if (!closedEntry) return;
    const html = readDist(`${siteConfig.directory.entryRoute}/${closedEntry.slug}/index.html`);
    expect(html).toContain("Dauerhaft geschlossen");
  });

  it("includes aggregate facts on category pages", () => {
    const html = readDist(`category/${sampleCategory.slug}/index.html`);
    expect(html).toContain('data-testid="aggregate-facts"');
  });

  it("has NAP consistency between HTML and JSON-LD", () => {
    const html = readDist(`${siteConfig.directory.entryRoute}/${sampleEntry!.slug}/index.html`);
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
    const llms = buildLlmsTxt(dataset);
    expect(llms).toContain(siteConfig.site.name);
    expect(llms).toContain(sampleCategory.slug);
  });
});
