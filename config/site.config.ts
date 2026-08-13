import type { SiteConfig } from "../src/lib/validation/site-schema.ts";

export function defineSite<T extends SiteConfig>(config: T): T {
  return config;
}

export default defineSite({
  site: {
    name: "Heilpraktiker Berlin",
    origin: "https://naturav.com",
    description:
      "Unabhängiges Verzeichnis von Heilpraktiker-Praxen in Berlin – nach Schwerpunkt und Bezirk.",
    defaultLocale: "de-DE",
  },

  operator: {
    name: "Michael Schmidt",
    street: "Torstr. 105-107",
    postalCode: "10119",
    city: "Berlin",
    country: "Deutschland",
    email: "info@naturav.com",
    legalForm: "Einzelunternehmen",
    contentResponsible: "Michael Schmidt",
  },

  forms: {
    contactAction: "https://formspree.io/f/meajkpdn",
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
