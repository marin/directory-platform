import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const entry = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./data/entries" }),
  schema: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    lastUpdated: z.string(),
    status: z.enum(["open", "closed"]).optional(),
    categories: z.array(z.string()),
    areaIds: z.array(z.string()).optional(),
    indicationIds: z.array(z.string()).optional(),
    associationIds: z.array(z.string()).optional(),
    qualifications: z.array(z.string()).optional(),
    address: z
      .object({
        street: z.string(),
        locality: z.string(),
        region: z.string(),
        postalCode: z.string().optional(),
        country: z.string(),
      })
      .optional(),
    geo: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    instagramUrl: z.string().optional(),
    bookingUrl: z.string().optional(),
    openingHours: z
      .array(
        z.object({
          day: z.string(),
          open: z.string(),
          close: z.string(),
        }),
      )
      .optional(),
    offers: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string(),
          durationMinutes: z.number().optional(),
          durationLabel: z.string().optional(),
          price: z.number().optional(),
          priceLabel: z.string().optional(),
          description: z.string().optional(),
        }),
      )
      .optional(),
    images: z.array(z.string()).optional(),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        }),
      )
      .optional(),
  }),
});

export const collections = { entries: entry };
