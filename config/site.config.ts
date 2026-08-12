import type { SiteConfig } from "../src/lib/validation/site-schema.ts";

export function defineSite<T extends SiteConfig>(config: T): T {
  return config;
}

export default defineSite({
  site: {
    name: "Example Directory",
    origin: "https://example.com",
    description: "Independent directory of example providers in Austin, Texas.",
    defaultLocale: "en-US",
  },

  directory: {
    entrySingular: "provider",
    entryPlural: "providers",
    entryRoute: "provider",
    currency: "USD",
    phoneRegion: "US",
    schemaType: "LocalBusiness",
  },

  geography: {
    locality: "Austin",
    region: "Texas",
    country: "US",
    timezone: "America/Chicago",
    center: { lat: 30.2672, lng: -97.7431 },
  },

  quality: {
    minListingsForCategoryPage: 4,
    minListingsForAreaPage: 3,
    autoApprove: {
      enabled: true,
      requireDescription: true,
      requireCategory: true,
      requireContactOrLocation: true,
    },
    uniquenessThreshold: 0.85,
    aggregateRatingMinCount: 3,
  },

  features: {
    areas: true,
    search: false,
    map: false,
    reviews: false,
    commercialPlacements: false,
    faqBlocks: true,
    llmsTxt: true,
    indexNowPing: false,
  },

  pagination: {
    categoryPageSize: 12,
    areaPageSize: 12,
  },
});
