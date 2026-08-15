import type { SiteConfig } from "../src/lib/validation/site-schema.ts";

export function defineSite<T extends SiteConfig>(config: T): T {
  return config;
}

/** Berlin-first Heilpraktiker directory — copy to config/site.config.ts when scaffolding. */
export default defineSite({
  site: {
    name: "Heilpraktiker Berlin",
    origin: "https://heilpraktiker-berlin.de",
    description:
      "Unabhängiges Verzeichnis von Heilpraktiker-Praxen in Berlin – nach Schwerpunkt und Bezirk.",
    defaultLocale: "de-DE",
  },

  directory: {
    entrySingular: "Heilpraktiker",
    entryPlural: "Heilpraktiker",
    entryRoute: "heilpraktiker",
    currency: "EUR",
    phoneRegion: "DE",
    schemaType: "MedicalBusiness",
  },

  geography: {
    locality: "Berlin",
    region: "Berlin",
    country: "DE",
    timezone: "Europe/Berlin",
    center: { lat: 52.52, lng: 13.405 },
  },

  quality: {
    minListingsForCategoryPage: 4,
    minListingsForAreaPage: 3,
    minListingsForIndicationPage: 4,
    minListingsForAssociationPage: 4,
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
    categoryPageSize: 36,
    areaPageSize: 36,
    indicationPageSize: 36,
    associationPageSize: 36,
  },
});
