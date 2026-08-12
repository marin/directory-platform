import siteConfig from "../../../config/site.config.ts";

export function entryPath(slug: string): string {
  return `/${siteConfig.directory.entryRoute}/${slug}`;
}

export function categoryPath(slug: string): string {
  return `/category/${slug}`;
}

export function areaPath(slug: string): string {
  return `/area/${slug}`;
}

export function absoluteUrl(path: string): string {
  const origin = siteConfig.site.origin.replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function entryUrl(slug: string): string {
  return absoluteUrl(entryPath(slug));
}

export function categoryUrl(slug: string): string {
  return absoluteUrl(categoryPath(slug));
}

export function areaUrl(slug: string): string {
  return absoluteUrl(areaPath(slug));
}

export function homePath(): string {
  return "/";
}

export function homeUrl(): string {
  return absoluteUrl("/");
}
