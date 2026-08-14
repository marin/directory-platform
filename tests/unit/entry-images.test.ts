import { describe, it, expect } from "vitest";
import {
  buildImageAlt,
  getPrimaryImage,
  isUsableImage,
  resolveCardImage,
  selectDisplayImages,
} from "../../src/lib/media/entry-images.ts";

describe("entry-images", () => {
  it("filters favicons, logos, and flags", () => {
    const images = [
      "https://example.com/favicon.ico",
      "https://example.com/wp-content/plugins/foo.png",
      "https://example.com/flags/de.png",
      "https://example.com/wp-content/uploads/praxis.jpg",
    ];
    expect(selectDisplayImages(images)).toEqual([
      "https://example.com/wp-content/uploads/praxis.jpg",
    ]);
  });

  it("prefers hero-sized images when scoring", () => {
    const images = [
      "https://example.com/logo-small.png",
      "https://example.com/wp-content/uploads/banner-hero.jpg",
      "https://image.jimcdn.com/app/cms/image/transf/dimension=1200x10000:format=jpg/path/hero.jpg",
    ];
    expect(getPrimaryImage(images)).toContain("dimension=1200x10000");
  });

  it("builds German alt text", () => {
    expect(buildImageAlt("Dr. Beispiel")).toBe("Praxisfoto von Dr. Beispiel");
    expect(buildImageAlt("Dr. Beispiel", 2)).toBe("Weiteres Praxisfoto von Dr. Beispiel");
  });

  it("resolves card image to thumb for local paths", () => {
    const slug = "sample-praxis";
    const images = [`/images/entries/${slug}/0.webp`];
    expect(resolveCardImage(slug, images)).toBe(`/images/entries/${slug}/thumb.webp`);
  });

  it("falls back to primary external image before local hosting", () => {
    expect(
      resolveCardImage("sample-praxis", ["https://example.com/wp-content/uploads/photo.jpg"]),
    ).toBe("https://example.com/wp-content/uploads/photo.jpg");
  });

  it("rejects unusable images", () => {
    expect(isUsableImage("https://example.com/favicon.ico")).toBe(false);
    expect(isUsableImage("https://example.com/wp-content/uploads/photo.jpg")).toBe(true);
  });
});
