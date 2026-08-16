import type { Dataset } from "../data/load-dataset.ts";
import {
  computeAggregateStats,
  computeCategoryStats,
  computeAreaStats,
  computeIndicationStats,
  computeAssociationStats,
} from "../aggregates/compute.ts";
import siteConfig from "../../../config/site.config.ts";
import { methodsPath, areasPath, indicationsPath, associationsPath } from "../routing/paths.ts";

/**
 * Strips the origin and any trailing slash so lookups don't depend on
 * Astro's trailingSlash / build.format settings (the sitemap integration
 * hands `serialize()` the fully-built absolute URL, e.g.
 * "https://naturav.com/methoden/akupunktur-tcm/3/").
 */
function toPathname(url: string): string {
  const pathname = url.replace(/^https?:\/\/[^/]+/, "") || "/";
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
}

type CollectionKind = "category" | "area" | "indikation" | "verband";

const COLLECTION_PREFIXES: Record<CollectionKind, string> = {
  category: `/${siteConfig.routes.category}`,
  area: `/${siteConfig.routes.area}`,
  indikation: `/${siteConfig.routes.indication}`,
  verband: `/${siteConfig.routes.association}`,
};

/**
 * Hub/overview pages whose freshness is defined as "most recent update
 * across the whole dataset". Stored without trailing slash because
 * `toPathname()` strips it.
 */
const DATASET_WIDE_PATHS = new Set(
  ["/", methodsPath(), areasPath(), indicationsPath(), associationsPath()].map(toPathname),
);

export interface LastmodResolver {
  /** Returns an ISO/W3C-DTF date string for the given built page URL, or undefined if none applies. */
  resolve(url: string): string | undefined;
}

/**
 * Builds a resolver that maps a built page's absolute URL to the `lastmod`
 * date it should carry in the sitemap:
 *  - entry pages    -> that entry's own `lastUpdated`
 *  - collection/hub detail pages (and their paginated pages) -> the most
 *    recent `lastUpdated` among the entries in that collection, reusing
 *    the existing compute*Stats().mostRecentUpdate aggregates
 *  - the homepage, /bezirk, /indikation, /verband, and /methoden (all
 *    dataset-driven overview pages) -> the most recent `lastUpdated`
 *    across the entire dataset
 *  - anything else (static/legal pages, 404, etc.) -> undefined, so the
 *    caller can choose to omit `lastmod` rather than invent one
 */
export function createLastmodResolver(dataset: Dataset): LastmodResolver {
  const entryRoute = `/${siteConfig.directory.entryRoute}`;

  const entryLastmod = new Map<string, string>();
  for (const entry of dataset.entries) {
    entryLastmod.set(entry.slug, entry.lastUpdated);
  }

  const collectionLastmod: Record<CollectionKind, Map<string, string | undefined>> = {
    category: new Map(
      dataset.categories.map((c) => [
        c.slug,
        computeCategoryStats(dataset.entries, c.id).mostRecentUpdate,
      ]),
    ),
    area: new Map(
      dataset.areas.map((a) => [a.slug, computeAreaStats(dataset.entries, a.id).mostRecentUpdate]),
    ),
    indikation: new Map(
      dataset.indications.map((i) => [
        i.slug,
        computeIndicationStats(dataset.entries, i.id).mostRecentUpdate,
      ]),
    ),
    verband: new Map(
      dataset.associations.map((a) => [
        a.slug,
        computeAssociationStats(dataset.entries, a.id).mostRecentUpdate,
      ]),
    ),
  };

  const datasetWideLastmod = computeAggregateStats(dataset.entries).mostRecentUpdate;

  const entryPattern = new RegExp(`^${entryRoute}/([^/]+)$`);
  const collectionPatterns = (Object.entries(COLLECTION_PREFIXES) as [CollectionKind, string][]).map(
    ([kind, prefix]) => [kind, new RegExp(`^${prefix}/([^/]+)(?:/\\d+)?$`)] as const,
  );

  function resolve(url: string): string | undefined {
    const pathname = toPathname(url);

    if (DATASET_WIDE_PATHS.has(pathname)) return datasetWideLastmod;

    const entryMatch = pathname.match(entryPattern);
    if (entryMatch) return entryLastmod.get(entryMatch[1]!);

    for (const [kind, pattern] of collectionPatterns) {
      const match = pathname.match(pattern);
      if (match) return collectionLastmod[kind].get(match[1]!);
    }

    return undefined;
  }

  return { resolve };
}
