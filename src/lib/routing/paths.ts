import siteConfig from "../../../config/site.config.ts";

export function entryPath(slug: string): string {
  return `/${siteConfig.directory.entryRoute}/${slug}`;
}

export function categoryPath(slug: string, page = 1): string {
  return page <= 1 ? `/category/${slug}` : `/category/${slug}/${page}`;
}

export function areaPath(slug: string, page = 1): string {
  return page <= 1 ? `/area/${slug}` : `/area/${slug}/${page}`;
}

export function indicationPath(slug: string, page = 1): string {
  return page <= 1 ? `/indikation/${slug}` : `/indikation/${slug}/${page}`;
}

export function indicationsPath(): string {
  return "/indikation";
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

export function associationPath(slug: string, page = 1): string {
  return page <= 1 ? `/verband/${slug}` : `/verband/${slug}/${page}`;
}

export function associationsPath(): string {
  return "/verband";
}

export function associationUrl(slug: string, page = 1): string {
  return absoluteUrl(associationPath(slug, page));
}

export function associationsUrl(): string {
  return absoluteUrl(associationsPath());
}

export function homePath(): string {
  return "/";
}

export function homeUrl(): string {
  return absoluteUrl("/");
}

export function claimPath(slug?: string): string {
  if (!slug) return "/eintrag-melden";
  return `/eintrag-melden?eintrag=${encodeURIComponent(slug)}`;
}
