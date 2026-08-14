import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import {
  entryImagePath,
  entryThumbPath,
  selectDisplayImages,
} from "./entry-images.ts";

export type ImageManifestEntry = {
  sourceUrl: string;
  localPath: string;
  hash: string;
};

export type ImageManifest = Record<string, ImageManifestEntry[]>;

const HERO_MAX_WIDTH = 1200;
const THUMB_MAX_WIDTH = 400;
const FETCH_TIMEOUT_MS = 30_000;

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isLocalImagePath(url: string): boolean {
  return url.startsWith("/images/entries/");
}

function manifestEntryForSource(
  manifest: ImageManifest,
  slug: string,
  sourceUrl: string,
): ImageManifestEntry | undefined {
  return manifest[slug]?.find((entry) => entry.sourceUrl === sourceUrl);
}

async function downloadImage(
  url: string,
  fetchImpl: typeof fetch,
): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { "User-Agent": "DirectoryBot/1.0 (+https://naturav.com)" },
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`unexpected content-type: ${contentType || "unknown"}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

async function writeOptimizedImage(
  input: Buffer,
  outputPath: string,
  maxWidth: number,
): Promise<void> {
  mkdirSync(dirname(outputPath), { recursive: true });
  await sharp(input)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);
}

export type PrepareEntryImagesResult = {
  images: string[];
  manifestEntries: ImageManifestEntry[];
  warnings: string[];
  changed: boolean;
};

export async function prepareEntryImages(options: {
  slug: string;
  images: string[];
  publicDir: string;
  manifest: ImageManifest;
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<PrepareEntryImagesResult> {
  const {
    slug,
    images,
    publicDir,
    manifest,
    dryRun = false,
    fetchImpl = fetch,
  } = options;

  const warnings: string[] = [];
  const manifestEntries: ImageManifestEntry[] = [];
  const selected = selectDisplayImages(images);
  const localImages: string[] = [];

  for (let index = 0; index < selected.length; index += 1) {
    const source = selected[index]!;
    const localPath = entryImagePath(slug, index);
    const absolutePath = join(publicDir, localPath);

    if (isLocalImagePath(source)) {
      if (existsSync(join(publicDir, source))) {
        localImages.push(source.startsWith("/") ? source : `/${source}`);
        const existing = manifestEntryForSource(manifest, slug, source);
        if (existing) manifestEntries.push(existing);
        continue;
      }
      warnings.push(`missing local image for ${slug}: ${source}`);
      continue;
    }

    if (!isRemoteUrl(source)) {
      warnings.push(`unsupported image URL for ${slug}: ${source}`);
      continue;
    }

    const sourceHash = hashString(source);
    const cached = manifestEntryForSource(manifest, slug, source);
    if (
      cached &&
      cached.hash === sourceHash &&
      existsSync(join(publicDir, cached.localPath))
    ) {
      localImages.push(cached.localPath);
      manifestEntries.push(cached);
      continue;
    }

    if (dryRun) {
      localImages.push(localPath);
      manifestEntries.push({ sourceUrl: source, localPath, hash: sourceHash });
      continue;
    }

    try {
      const downloaded = await downloadImage(source, fetchImpl);
      await writeOptimizedImage(downloaded, absolutePath, HERO_MAX_WIDTH);
      localImages.push(localPath);
      manifestEntries.push({ sourceUrl: source, localPath, hash: sourceHash });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`failed to download ${source} for ${slug}: ${message}`);
    }
  }

  const primaryPath = localImages[0];
  if (
    !dryRun &&
    primaryPath &&
    existsSync(join(publicDir, primaryPath))
  ) {
    const thumbAbsolute = join(publicDir, entryThumbPath(slug));
    await writeOptimizedImage(
      readFileSync(join(publicDir, primaryPath)),
      thumbAbsolute,
      THUMB_MAX_WIDTH,
    );
  }

  const changed = JSON.stringify(images) !== JSON.stringify(localImages);
  return { images: localImages, manifestEntries, warnings, changed };
}

export function loadImageManifest(path: string): ImageManifest {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8")) as ImageManifest;
}

export function saveImageManifest(path: string, manifest: ImageManifest): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}
