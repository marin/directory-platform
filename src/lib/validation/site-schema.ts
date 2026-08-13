import { z } from "zod";

export const siteConfigSchema = z.object({
  site: z.object({
    name: z.string().min(1),
    origin: z.string().url(),
    description: z.string().min(1),
    defaultLocale: z.string().min(2),
  }),
  operator: z.object({
    name: z.string().min(1),
    street: z.string().min(1),
    postalCode: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    legalForm: z.string().min(1),
    contentResponsible: z.string().min(1),
    vatId: z.string().optional(),
    registerCourt: z.string().optional(),
    registerNumber: z.string().optional(),
  }),
  forms: z.object({
    contactAction: z.string().url(),
  }),
  directory: z.object({
    entrySingular: z.string().min(1),
    entryPlural: z.string().min(1),
    entryRoute: z.string().min(1),
    currency: z.string().length(3),
    phoneRegion: z.string().length(2),
    schemaType: z.string().min(1),
  }),
  geography: z.object({
    locality: z.string().min(1),
    region: z.string().min(1),
    country: z.string().length(2),
    timezone: z.string().min(1),
    center: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  quality: z.object({
    minListingsForCategoryPage: z.number().int().positive(),
    minListingsForAreaPage: z.number().int().positive(),
    autoApprove: z.object({
      enabled: z.boolean(),
      requireDescription: z.boolean(),
      requireCategory: z.boolean(),
      requireContactOrLocation: z.boolean(),
    }),
    uniquenessThreshold: z.number().min(0).max(1),
    aggregateRatingMinCount: z.number().int().positive(),
  }),
  features: z.object({
    areas: z.boolean(),
    search: z.boolean(),
    map: z.boolean(),
    reviews: z.boolean(),
    commercialPlacements: z.boolean(),
    faqBlocks: z.boolean(),
    llmsTxt: z.boolean(),
    indexNowPing: z.boolean(),
  }),
  pagination: z.object({
    categoryPageSize: z.number().int().positive(),
    areaPageSize: z.number().int().positive(),
  }),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
