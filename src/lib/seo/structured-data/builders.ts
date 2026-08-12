import siteConfig from "../../../../config/site.config.ts";
import type { NormalizedEntry } from "../../data/normalize-entry.ts";
import type { Category } from "../../validation/category-schema.ts";
import type { Area } from "../../validation/area-schema.ts";
import { absoluteUrl, categoryPath, entryPath, homePath } from "../../routing/paths.ts";
import type { AggregateStats } from "../../aggregates/compute.ts";
import { formatPrice } from "../../aggregates/compute.ts";

export function buildBreadcrumbList(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildListingJsonLd(
  entry: NormalizedEntry,
  category: Category | undefined,
): Record<string, unknown> {
  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", path: homePath() },
    ...(category
      ? [{ name: category.name, path: categoryPath(category.slug) }]
      : []),
    { name: entry.name, path: entryPath(entry.slug) },
  ]);

  const business: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": siteConfig.directory.schemaType,
    name: entry.nap.name,
    description: entry.description,
    url: absoluteUrl(entryPath(entry.slug)),
    dateModified: entry.lastUpdated,
  };

  if (entry.nap.formattedAddress) {
    business.address = {
      "@type": "PostalAddress",
      streetAddress: entry.address?.street,
      addressLocality: entry.address?.locality,
      addressRegion: entry.address?.region,
      postalCode: entry.address?.postalCode,
      addressCountry: entry.address?.country,
    };
  }
  if (entry.nap.formattedPhone) {
    business.telephone = entry.nap.formattedPhone;
  }
  if (entry.geo) {
    business.geo = {
      "@type": "GeoCoordinates",
      latitude: entry.geo.lat,
      longitude: entry.geo.lng,
    };
  }
  if (entry.website) business.sameAs = [entry.website];

  if (entry.isOpen && (entry.offers ?? []).length > 0) {
    business.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: (entry.offers ?? []).map((offer) => ({
        "@type": "Offer",
        name: offer.name,
        price: offer.price,
        priceCurrency: siteConfig.directory.currency,
        description: offer.description,
      })),
    };
  }

  const graphs: Record<string, unknown>[] = [business, breadcrumbs];

  if ((entry.faq ?? []).length > 0) {
    graphs.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: entry.faq!.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return graphs.length === 1 ? graphs[0]! : { "@context": "https://schema.org", "@graph": graphs };
}

export function buildCollectionJsonLd(
  type: "category" | "area",
  item: Category | Area,
  entries: NormalizedEntry[],
  stats: AggregateStats,
  faq?: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  const path = type === "category" ? categoryPath(item.slug) : `/area/${item.slug}`;
  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", path: homePath() },
    { name: item.name, path },
  ]);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: item.name,
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(entryPath(entry.slug)),
      name: entry.name,
    })),
  };

  const graphs: Record<string, unknown>[] = [breadcrumbs, itemList];

  if (stats.priceStats.count > 0 && stats.priceStats.min !== undefined) {
    graphs.push({
      "@context": "https://schema.org",
      "@type": "AggregateOffer",
      lowPrice: stats.priceStats.min,
      highPrice: stats.priceStats.max,
      offerCount: stats.priceStats.count,
      priceCurrency: siteConfig.directory.currency,
    });
  }

  if (faq && faq.length > 0) {
    graphs.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graphs };
}

export function buildAggregateFactText(
  stats: AggregateStats,
  label: string,
): string {
  const parts: string[] = [`${stats.listingCount} open ${siteConfig.directory.entryPlural} in ${label}`];
  if (stats.priceStats.median !== undefined) {
    parts.push(`median price ${formatPrice(stats.priceStats.median)}`);
  }
  if (stats.mostRecentUpdate) {
    parts.push(`updated ${stats.mostRecentUpdate}`);
  }
  return parts.join(" — ");
}
