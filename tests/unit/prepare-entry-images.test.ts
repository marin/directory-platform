import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import {
  loadImageManifest,
  prepareEntryImages,
  saveImageManifest,
} from "../../src/lib/media/prepare-entry-images.ts";

const FIXTURE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("prepareEntryImages", () => {
  let tempDir = "";
  let publicDir = "";

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "prepare-entry-images-"));
    publicDir = join(tempDir, "public");
    mkdirSync(publicDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("downloads remote images and rewrites to local paths", async () => {
    const slug = "fixture-praxis";
    const sourceUrl = "https://example.com/wp-content/uploads/praxis.jpg";
    const fetchImpl = async () =>
      new Response(FIXTURE_PNG, {
        status: 200,
        headers: { "content-type": "image/png" },
      });

    const result = await prepareEntryImages({
      slug,
      images: [sourceUrl],
      publicDir,
      manifest: {},
      fetchImpl,
    });

    expect(result.images).toEqual([`/images/entries/${slug}/0.webp`]);
    expect(result.changed).toBe(true);
    expect(readFileSync(join(publicDir, result.images[0]!)).byteLength).toBeGreaterThan(0);
    expect(readFileSync(join(publicDir, `/images/entries/${slug}/thumb.webp`)).byteLength).toBeGreaterThan(0);
  });

  it("reuses manifest entries without re-downloading", async () => {
    const slug = "cached-praxis";
    const sourceUrl = "https://example.com/wp-content/uploads/cached.jpg";
    const localPath = `/images/entries/${slug}/0.webp`;
    const absolutePath = join(publicDir, localPath);
    mkdirSync(join(publicDir, "images/entries", slug), { recursive: true });
    await sharp(FIXTURE_PNG).webp().toFile(absolutePath);

    const manifest = {
      [slug]: [
        {
          sourceUrl,
          localPath,
          hash: createHash("sha256").update(sourceUrl).digest("hex").slice(0, 12),
        },
      ],
    };

    const fetchImpl = async () => {
      throw new Error("should not fetch when cached");
    };

    const result = await prepareEntryImages({
      slug,
      images: [sourceUrl],
      publicDir,
      manifest,
      fetchImpl,
    });

    expect(result.images).toEqual([localPath]);
    expect(result.warnings).toEqual([]);
  });

  it("generates thumb from first local image even when not index 0", async () => {
    const slug = "offset-praxis";
    const localPath = `/images/entries/${slug}/1.webp`;
    const absolutePath = join(publicDir, localPath);
    mkdirSync(join(publicDir, "images/entries", slug), { recursive: true });
    await sharp(FIXTURE_PNG).webp().toFile(absolutePath);

    const result = await prepareEntryImages({
      slug,
      images: [localPath],
      publicDir,
      manifest: {},
    });

    expect(result.images).toEqual([localPath]);
    expect(readFileSync(join(publicDir, `/images/entries/${slug}/thumb.webp`)).byteLength).toBeGreaterThan(0);
  });

  it("persists manifest entries", () => {
    const manifestPath = join(tempDir, "manifest.json");
    saveImageManifest(manifestPath, { demo: [{ sourceUrl: "a", localPath: "/b", hash: "c" }] });
    expect(loadImageManifest(manifestPath).demo?.[0]?.localPath).toBe("/b");
  });
});
