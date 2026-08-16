import siteConfig from "../../../config/site.config.ts";

const { entryRoute } = siteConfig.directory;
const { category, area, indication, association } = siteConfig.routes;

/**
 * All route helpers emit directory-style paths with a trailing slash, matching
 * Astro's `build.format: "directory"` output and the sitemap's `<loc>` values.
 */
function dirPath(...segments: Array<string | number>): string {
  return `/${segments.join("/")}/`;
}

export function entryPath(slug: string): string {
  return dirPath(entryRoute, slug);
}

export function categoryPath(slug: string, page = 1): string {
  return page <= 1 ? dirPath(category, slug) : dirPath(category, slug, page);
}

export function areaPath(slug: string, page = 1): string {
  return page <= 1 ? dirPath(area, slug) : dirPath(area, slug, page);
}

export function indicationPath(slug: string, page = 1): string {
  return page <= 1 ? dirPath(indication, slug) : dirPath(indication, slug, page);
}

export function indicationsPath(): string {
  return dirPath(indication);
}

export function associationPath(slug: string, page = 1): string {
  return page <= 1 ? dirPath(association, slug) : dirPath(association, slug, page);
}

export function associationsPath(): string {
  return dirPath(association);
}

export function methodsPath(): string {
  return dirPath(category);
}

export function areasPath(): string {
  return dirPath(area);
}

export function homePath(): string {
  return "/";
}

export function claimPath(slug?: string): string {
  if (!slug) return "/eintrag-melden/";
  return `/eintrag-melden/?eintrag=${encodeURIComponent(slug)}`;
}

export function absoluteUrl(path: string): string {
  const origin = siteConfig.site.origin.replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function entryUrl(slug: string): string {
  return absoluteUrl(entryPath(slug));
}

export function categoryUrl(slug: string, page = 1): string {
  return absoluteUrl(categoryPath(slug, page));
}

export function areaUrl(slug: string, page = 1): string {
  return absoluteUrl(areaPath(slug, page));
}

export function indicationUrl(slug: string, page = 1): string {
  return absoluteUrl(indicationPath(slug, page));
}

export function indicationsUrl(): string {
  return absoluteUrl(indicationsPath());
}

export function associationUrl(slug: string, page = 1): string {
  return absoluteUrl(associationPath(slug, page));
}

export function associationsUrl(): string {
  return absoluteUrl(associationsPath());
}

export function methodsUrl(): string {
  return absoluteUrl(methodsPath());
}

export function areasUrl(): string {
  return absoluteUrl(areasPath());
}

export function homeUrl(): string {
  return absoluteUrl("/");
}
