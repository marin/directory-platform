import siteConfig from "../../../../config/site.config.ts";
import type { NormalizedEntry } from "../../data/normalize-entry.ts";
import type { Category } from "../../validation/category-schema.ts";
import type { Area } from "../../validation/area-schema.ts";
import type { Indication } from "../../validation/indication-schema.ts";
import type { Association } from "../../validation/association-schema.ts";
import { categoryPath, areaPath, indicationPath, indicationsPath, associationPath, associationsPath, absoluteUrl, entryPath, homePath, homeUrl } from "../../routing/paths.ts";
import type { AggregateStats } from "../../aggregates/compute.ts";
import { formatPrice } from "../../aggregates/compute.ts";
import {
  extractPlaceIdFromGoogleMapsUrl,
  resolveGoogleMapsUrl,
} from "../../geo/google-maps.ts";
import {
  hasGoogleMapsRating,
  shouldEmitAggregateRating,
} from "../../geo/google-maps-rating.ts";
import { getPrimaryImage } from "../../media/entry-images.ts";
import { detectsHpp } from "../../data/extract-badges.ts";

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

const DAY_OF_WEEK_SCHEMA_URLS: Record<string, string> = {
  Monday: "https://schema.org/Monday",
  Tuesday: "https://schema.org/Tuesday",
  Wednesday: "https://schema.org/Wednesday",
  Thursday: "https://schema.org/Thursday",
  Friday: "https://schema.org/Friday",
  Saturday: "https://schema.org/Saturday",
  Sunday: "https://schema.org/Sunday",
};

const TIME_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Maps the stored `openingHours` rows (already validated against
 * `openingHoursSchema` at data-load time) to schema.org
 * `OpeningHoursSpecification` objects. One specification is emitted per
 * stored row, so split hours (e.g. a lunch break) naturally become two
 * specifications sharing the same `dayOfWeek` — the pattern schema.org's
 * own examples use. Rows with an unrecognized day or a time that isn't
 * 24h `HH:MM` are skipped rather than emitted as malformed markup.
 */
function toOpeningHoursSpecification(
  hours: NormalizedEntry["openingHours"],
): Record<string, unknown>[] {
  return (hours ?? []).flatMap((hour) => {
    const dayOfWeek = hour?.day ? DAY_OF_WEEK_SCHEMA_URLS[hour.day] : undefined;
    const opens =
      typeof hour?.open === "string" && TIME_24H_PATTERN.test(hour.open)
        ? hour.open
        : undefined;
    const closes =
      typeof hour?.close === "string" && TIME_24H_PATTERN.test(hour.close)
        ? hour.close
        : undefined;
    if (!dayOfWeek || !opens || !closes) return [];
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek,
        opens,
        closes,
      },
    ];
  });
}

/**
 * Derives a schema.org `priceRange` string from offers with a usable
 * numeric price, formatted the same way prices are shown elsewhere on
 * the site (`formatPrice`). Returns undefined when no offer has a price.
 */
function computePriceRange(offers: NormalizedEntry["offers"]): string | undefined {
  const prices = (offers ?? [])
    .map((offer) => offer.price)
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price));
  if (prices.length === 0) return undefined;

  const low = formatPrice(Math.min(...prices));
  const high = formatPrice(Math.max(...prices));
  if (!low || !high) return undefined;
  return low === high ? low : `${low} – ${high}`;
}

export function buildListingJsonLd(
  entry: NormalizedEntry,
  category: Category | undefined,
  areas: Area[] = [],
  indications: Indication[] = [],
  associations: Association[] = [],
): Record<string, unknown> {
  const breadcrumbs = buildBreadcrumbList([
    { name: "Startseite", path: homePath() },
    ...(category
      ? [{ name: category.name, path: categoryPath(category.slug) }]
      : []),
    ...(areas[0] ? [{ name: areas[0].name, path: areaPath(areas[0].slug) }] : []),
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
  if (areas.length > 0) {
    business.areaServed = areas.map((item) => ({
      "@type": "AdministrativeArea",
      name: item.name,
    }));
  }
  const mapsListingUrl = resolveGoogleMapsUrl(
    extractPlaceIdFromGoogleMapsUrl(entry.googleMapsUrl),
    entry.googleMapsUrl,
  );
  if (mapsListingUrl) business.hasMap = mapsListingUrl;
  const sameAs = [entry.website, entry.instagramUrl].filter(
    (url): url is string => Boolean(url),
  );
  if (sameAs.length > 0) business.sameAs = sameAs;
  if (detectsHpp(entry)) {
    business.medicalSpecialty = "Psychotherapie";
  }
  if (indications.length > 0) {
    business.knowsAbout = indications.map((item) => ({
      "@type": "MedicalCondition",
      name: item.name,
    }));
  }
  if (associations.length > 0) {
    business.memberOf = associations.map((item) => ({
      "@type": "Organization",
      name: item.abbreviation ? `${item.name} (${item.abbreviation})` : item.name,
      url: absoluteUrl(associationPath(item.slug)),
    }));
  }

  const primaryImage = getPrimaryImage(entry.images ?? []);
  if (primaryImage) {
    business.image = absoluteUrl(primaryImage);
  }

  if (
    hasGoogleMapsRating(entry) &&
    shouldEmitAggregateRating(entry.googleMapsRatingsCount!)
  ) {
    business.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: entry.googleMapsRating,
      reviewCount: entry.googleMapsRatingsCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (entry.isOpen && (entry.offers ?? []).length > 0) {
    business.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Leistungen",
      itemListElement: (entry.offers ?? []).map((offer) => ({
        "@type": "Offer",
        name: offer.name,
        price: offer.price,
        priceCurrency: siteConfig.directory.currency,
        description: offer.description,
      })),
    };
    business.availableService = (entry.offers ?? []).map((offer) => ({
      "@type": "MedicalTherapy",
      name: offer.name,
    }));
  }

  if (entry.isOpen) {
    const priceRange = computePriceRange(entry.offers);
    if (priceRange) business.priceRange = priceRange;

    const openingHoursSpecification = toOpeningHoursSpecification(entry.openingHours);
    if (openingHoursSpecification.length > 0) {
      business.openingHoursSpecification = openingHoursSpecification;
    }
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
  type: "category" | "area" | "indication" | "association",
  item: { name: string; slug: string; abbreviation?: string; kind?: "verband" | "zertifikat" },
  entries: NormalizedEntry[],
  stats: AggregateStats,
  faq?: Array<{ question: string; answer: string }>,
  page = 1,
): Record<string, unknown> {
  // The last breadcrumb must match the page's own canonical URL, so a
  // paginated call (page > 1) needs the page-N path, not page 1's.
  const path =
    type === "category"
      ? categoryPath(item.slug, page)
      : type === "area"
        ? areaPath(item.slug, page)
        : type === "association"
          ? associationPath(item.slug, page)
          : indicationPath(item.slug, page);
  const associationShort = item.abbreviation ?? item.name;
  const listName =
    type === "indication"
      ? `${siteConfig.directory.entryPlural} für ${item.name} in ${siteConfig.geography.locality}`
      : type === "association"
        ? item.kind === "zertifikat"
          ? `${siteConfig.directory.entryPlural} mit ${associationShort}-Zertifikat in ${siteConfig.geography.locality}`
          : `${siteConfig.directory.entryPlural} im ${associationShort} in ${siteConfig.geography.locality}`
        : item.name;
  const breadcrumbs = buildBreadcrumbList(
    type === "indication"
      ? [
          { name: "Startseite", path: homePath() },
          { name: "Beschwerden", path: indicationsPath() },
          { name: item.name, path },
        ]
      : type === "association"
        ? [
            { name: "Startseite", path: homePath() },
            { name: "Verbände", path: associationsPath() },
            { name: item.name, path },
          ]
        : [
            { name: "Startseite", path: homePath() },
            { name: item.name, path },
          ],
  );

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
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

export function buildIndicationsIndexJsonLd(
  hubs: Array<{ name: string; slug: string }>,
  title: string,
  description: string,
  faq: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  const path = indicationsPath();
  const url = absoluteUrl(path);
  const breadcrumbs = buildBreadcrumbList([
    { name: "Startseite", path: homePath() },
    { name: "Beschwerden", path },
  ]);

  const itemList = {
    "@type": "ItemList",
    "@id": `${url}#list`,
    name: title,
    numberOfItems: hubs.length,
    itemListElement: hubs.map((hub, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(indicationPath(hub.slug)),
      name: hub.name,
      item: {
        "@type": "MedicalCondition",
        name: hub.name,
        url: absoluteUrl(indicationPath(hub.slug)),
      },
    })),
  };

  const collectionPage = {
    "@type": "CollectionPage",
    name: title,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.site.name,
      url: homeUrl(),
    },
    mainEntity: { "@id": `${url}#list` },
  };

  const graphs: Record<string, unknown>[] = [breadcrumbs, collectionPage, itemList];

  if (faq.length > 0) {
    graphs.push({
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

export function buildAssociationsIndexJsonLd(
  hubs: Array<{ name: string; slug: string }>,
  title: string,
  description: string,
  faq: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  const path = associationsPath();
  const url = absoluteUrl(path);
  const breadcrumbs = buildBreadcrumbList([
    { name: "Startseite", path: homePath() },
    { name: "Verbände", path },
  ]);

  const itemList = {
    "@type": "ItemList",
    "@id": `${url}#list`,
    name: title,
    numberOfItems: hubs.length,
    itemListElement: hubs.map((hub, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(associationPath(hub.slug)),
      name: hub.name,
      item: {
        "@type": "Organization",
        name: hub.name,
        url: absoluteUrl(associationPath(hub.slug)),
      },
    })),
  };

  const collectionPage = {
    "@type": "CollectionPage",
    name: title,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.site.name,
      url: homeUrl(),
    },
    mainEntity: { "@id": `${url}#list` },
  };

  const graphs: Record<string, unknown>[] = [breadcrumbs, collectionPage, itemList];

  if (faq.length > 0) {
    graphs.push({
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
  const parts: string[] = [`${stats.listingCount} ${siteConfig.directory.entryPlural} in ${label}`];
  if (stats.priceStats.median !== undefined) {
    parts.push(`Medianpreis ${formatPrice(stats.priceStats.median)}`);
  }
  if (stats.mostRecentUpdate) {
    const formatted = new Intl.DateTimeFormat(siteConfig.site.defaultLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(stats.mostRecentUpdate));
    parts.push(`aktualisiert am ${formatted}`);
  }
  return parts.join(" — ");
}
