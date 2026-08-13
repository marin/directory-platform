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

export function homePath(): string {
  return "/";
}

export function homeUrl(): string {
  return absoluteUrl("/");
}
