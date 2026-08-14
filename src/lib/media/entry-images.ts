const SKIP_IMAGE_RE =
  /favicon|\.ico(?:\?|$)|\/icon[-_/]|logo[-_]?(?:small|tiny|mini)|pixel|spacer|badge|1x1|gravatar|facebook\.com\/tr|google-analytics|doubleclick|\/flags\/|translatepress|wp-content\/plugins/i;

export function isUsableImage(url: string): boolean {
  if (SKIP_IMAGE_RE.test(url)) return false;
  return (
    /\.(jpe?g|png|webp|gif)(?:\?|$)/i.test(url) ||
    /image\.jimcdn\.com|cloudinary|imgix|wp-content\/uploads/i.test(url)
  );
}

export function scoreImage(url: string): number {
  let score = 0;
  if (/dimension=\d+x10000|width=\d{3,}/i.test(url)) score += 2;
  if (/backgroundarea|banner|hero/i.test(url)) score += 1;
  if (/favicon|icon|logo/i.test(url)) score -= 5;
  if (/\.jpe?g|\.png|\.webp/i.test(url)) score += 1;
  return score;
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(url);
  }
  return result;
}

export function selectDisplayImages(images: string[], limit = 5): string[] {
  return uniqueUrls(images.filter(isUsableImage))
    .sort((a, b) => scoreImage(b) - scoreImage(a))
    .slice(0, limit);
}

export function getPrimaryImage(images: string[]): string | undefined {
  return selectDisplayImages(images, 1)[0];
}

export function buildImageAlt(entryName: string, index = 0): string {
  if (index === 0) return `Praxisfoto von ${entryName}`;
  return `Weiteres Praxisfoto von ${entryName}`;
}

export function entryImageDir(slug: string): string {
  return `/images/entries/${slug}`;
}

export function entryImagePath(slug: string, index: number): string {
  return `${entryImageDir(slug)}/${index}.webp`;
}

export function entryThumbPath(slug: string): string {
  return `${entryImageDir(slug)}/thumb.webp`;
}

export function resolveCardImage(slug: string, images: string[]): string | undefined {
  const display = selectDisplayImages(images);
  if (display.length === 0) return undefined;
  const localDir = entryImageDir(slug);
  if (display.some((image) => image.startsWith(localDir))) {
    return entryThumbPath(slug);
  }
  return display[0];
}
