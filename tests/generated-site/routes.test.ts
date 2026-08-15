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
    expect(html).toContain('data-testid="entry-map-section"');
    expect(html).toContain('data-testid="map-embed"');
    expect(html).toContain('data-testid="map-directions-link"');
    expect(html).toContain('data-testid="breadcrumbs"');
    expect(html).toContain('data-testid="entry-tags"');
    expect(html).toContain('data-testid="last-updated"');
  });

  it("renders Google rating on practitioner pages when data exists", () => {
    const entryWithRating = dataset.entries.find(
      (entry) => entry.googleMapsRating && entry.googleMapsRatingsCount,
    );
    if (!entryWithRating) return;

    const html = readDist(
      `${siteConfig.directory.entryRoute}/${entryWithRating.slug}/index.html`,
    );
    expect(html).toContain('data-testid="entry-google-rating-section"');
    expect(html).toContain('data-testid="google-maps-rating"');
    expect(html).toContain('data-testid="nap-google-rating"');
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

  it("renders HPP and children badges when copy supports them", () => {
    const hppEntry = dataset.entries.find((entry) =>
      /heilpraktiker(?:in)? für psychotherapie/i.test(entry.name),
    );
    const kinderEntry = dataset.entries.find((entry) =>
      /kinderosteopathie/i.test(`${entry.name} ${entry.description}`),
    );
    expect(hppEntry).toBeDefined();
    expect(kinderEntry).toBeDefined();

    const hppHtml = readDist(
      `${siteConfig.directory.entryRoute}/${hppEntry!.slug}/index.html`,
    );
    expect(hppHtml).toContain('data-testid="entry-badge-hpp"');
    expect(hppHtml).toContain("Heilpraktiker für Psychotherapie");
    expect(hppHtml).toContain('"medicalSpecialty":"Psychotherapie"');

    const kinderHtml = readDist(
      `${siteConfig.directory.entryRoute}/${kinderEntry!.slug}/index.html`,
    );
    expect(kinderHtml).toContain('data-testid="entry-badge-kinder"');
    expect(kinderHtml).toContain("Behandelt Kinder");
  });

  it("links claim from profiles and names related listings by district", () => {
    const html = readDist(`${siteConfig.directory.entryRoute}/${sampleEntry!.slug}/index.html`);
    expect(html).toContain('data-testid="entry-claim"');
    expect(html).toContain(`/eintrag-melden?eintrag=${encodeURIComponent(sampleEntry!.slug)}`);
    expect(html).toMatch(/Weitere Heilpraktiker(?: für [^<]+)? in /);
  });

  it("renders indication tags when entries are tagged", () => {
    const taggedEntry = dataset.entries.find(
      (entry) => entry.isOpen && (entry.indicationIds ?? []).length > 0,
    );
    if (!taggedEntry) return;

    const html = readDist(
      `${siteConfig.directory.entryRoute}/${taggedEntry.slug}/index.html`,
    );
    expect(html).toContain('data-testid="entry-indications"');
    expect(html).toContain("Behandelt unter anderem");
    expect(html).toContain('data-testid="entry-indication-link"');
    expect(html).toContain("/indikation/");
    expect(html).toContain('"@type":"MedicalCondition"');
  });

  it("renders association chips and a credentials line when tagged", () => {
    const taggedEntry = dataset.entries.find(
      (entry) =>
        entry.isOpen &&
        ((entry.associationIds ?? []).length > 0 || (entry.qualifications ?? []).length > 0),
    );
    if (!taggedEntry) return;

    const html = readDist(
      `${siteConfig.directory.entryRoute}/${taggedEntry.slug}/index.html`,
    );
    expect(html).toContain('data-testid="entry-credentials"');
    if ((taggedEntry.associationIds ?? []).length > 0) {
      expect(html).toContain('data-testid="entry-associations"');
      expect(html).toContain('"@type":"Organization"');
      expect(html).toContain("/verband/");
      expect(html).toContain(`href="/verband/${taggedEntry.associationIds![0]}`);
    }
  });

  it("builds indication hub pages for tagged complaints", () => {
    const tagged = dataset.indications.find((indication) =>
      dataset.entries.some(
        (entry) => entry.isOpen && (entry.indicationIds ?? []).includes(indication.id),
      ),
    );
    expect(tagged).toBeDefined();
    const html = readDist(`indikation/${tagged!.slug}/index.html`);
    expect(html).toContain('data-testid="indication-page"');
    expect(html).toContain(`Heilpraktiker für ${tagged!.name} in Berlin`);
    expect(html).toContain('data-testid="indication-intro"');
    expect(html).toContain('data-testid="breadcrumbs"');
    expect(html).toContain('href="/indikation"');
  });

  it("builds an indexable indications overview at /indikation/", () => {
    const html = readDist("indikation/index.html");
    expect(html).toContain('data-testid="indications-index"');
    expect(html).toContain("Heilpraktiker nach Beschwerde in Berlin");
    expect(html).toContain('data-testid="indications-index-intro"');
    expect(html).toContain('data-testid="indications-index-hub"');
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain("Häufig gestellte Fragen");
  });

  it("lists indexable indication hubs on the homepage", () => {
    const html = readDist("index.html");
    expect(html).toContain("Nach Beschwerde");
    expect(html).toContain('data-testid="home-indication"');
    expect(html).toContain('data-testid="home-indications-heading"');
    expect(html).toContain('href="/indikation"');
  });

  it("builds association hub pages for tagged memberships", () => {
    const tagged = dataset.associations.find((association) =>
      dataset.entries.some(
        (entry) => entry.isOpen && (entry.associationIds ?? []).includes(association.id),
      ),
    );
    expect(tagged).toBeDefined();
    const html = readDist(`verband/${tagged!.slug}/index.html`);
    expect(html).toContain('data-testid="association-page"');
    expect(html).toContain("in Berlin");
    expect(html).toContain('data-testid="association-intro"');
    expect(html).toContain('data-testid="breadcrumbs"');
    expect(html).toContain('href="/verband"');
  });

  it("builds an indexable associations overview at /verband/", () => {
    const html = readDist("verband/index.html");
    expect(html).toContain('data-testid="associations-index"');
    expect(html).toContain("Heilpraktiker nach Verband in Berlin");
    expect(html).toContain('data-testid="associations-index-intro"');
    expect(html).toContain('data-testid="associations-index-hub"');
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain("Häufig gestellte Fragen");
  });

  it("lists indexable association hubs on the homepage", () => {
    const html = readDist("index.html");
    expect(html).toContain("Nach Verband");
    expect(html).toContain('data-testid="home-association"');
    expect(html).toContain('data-testid="home-associations-heading"');
    expect(html).toContain('href="/verband"');
  });

  it("renders Instagram when a profile URL is tagged", () => {
    const taggedEntry = dataset.entries.find(
      (entry) => entry.isOpen && entry.instagramUrl,
    );
    if (!taggedEntry) return;

    const html = readDist(
      `${siteConfig.directory.entryRoute}/${taggedEntry.slug}/index.html`,
    );
    expect(html).toContain('data-testid="nap-instagram"');
    expect(html).toContain('data-testid="cta-instagram"');
    expect(html).toContain(taggedEntry.instagramUrl);
    expect(html).toContain(`"${taggedEntry.instagramUrl}"`);
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

  it("includes last updated on category pages", () => {
    const html = readDist(`category/${sampleCategory.slug}/index.html`);
    expect(html).toContain('data-testid="last-updated"');
    expect(html).not.toContain('data-testid="aggregate-facts"');
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
    const sampleIndication = dataset.indications.find((indication) =>
      dataset.entries.some(
        (entry) => entry.isOpen && (entry.indicationIds ?? []).includes(indication.id),
      ),
    );
    if (sampleIndication) {
      expect(llms).toContain(sampleIndication.slug);
    }
    expect(llms).toContain(`Übersicht: ${siteConfig.site.origin}/indikation`);
    expect(llms).toContain(`Übersicht: ${siteConfig.site.origin}/verband`);
    const sampleAssociation = dataset.associations.find((association) =>
      dataset.entries.some(
        (entry) => entry.isOpen && (entry.associationIds ?? []).includes(association.id),
      ),
    );
    if (sampleAssociation) {
      expect(llms).toContain(sampleAssociation.slug);
    }
  });

  it("renders entry images and og:image when local images exist", () => {
    const entryWithImages = dataset.entries.find(
      (entry) => (entry.images ?? []).some((image) => image.startsWith("/images/entries/")),
    );
    if (!entryWithImages) return;

    const html = readDist(
      `${siteConfig.directory.entryRoute}/${entryWithImages.slug}/index.html`,
    );
    expect(html).toContain('data-testid="entry-images-section"');
    expect(html).toContain('data-testid="entry-hero-image"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain("/images/entries/");
  });

  it("renders card thumbnails on category pages when images exist", () => {
    const entryWithImages = dataset.entries.find(
      (entry) =>
        entry.isOpen &&
        (entry.images ?? []).some((image) => image.startsWith("/images/entries/")),
    );
    if (!entryWithImages) return;

    const category = dataset.categories.find((item) => item.id === entryWithImages.categories[0]);
    if (!category) return;

    const html = readDist(`category/${category.slug}/index.html`);
    expect(html).toContain('data-testid="entry-card-image"');
  });
});
