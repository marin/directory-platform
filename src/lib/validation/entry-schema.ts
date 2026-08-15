import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const offerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  durationMinutes: z.number().int().positive().optional(),
  durationLabel: z.string().optional(),
  price: z.number().nonnegative().optional(),
  priceLabel: z.string().optional(),
  description: z.string().optional(),
});

export const addressSchema = z.object({
  street: z.string().min(1),
  locality: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string().optional(),
  country: z.string().length(2),
});

export const geoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const openingHoursSchema = z.object({
  day: z.enum([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});

export const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const entrySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  lastUpdated: dateSchema,
  status: z.enum(["open", "closed"]).optional().default("open"),
  categories: z.array(z.string().min(1)).min(1),
  areaIds: z.array(z.string().min(1)).optional().default([]),
  indicationIds: z.array(z.string().min(1)).optional().default([]),
  address: addressSchema.optional(),
  geo: geoSchema.optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  bookingUrl: z.string().url().optional(),
  googleMapsUrl: z.string().url().optional(),
  googleMapsRating: z.number().min(1).max(5).optional(),
  googleMapsRatingsCount: z.number().int().positive().optional(),
  openingHours: z.array(openingHoursSchema).optional().default([]),
  offers: z.array(offerSchema).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  faq: z.array(faqItemSchema).optional().default([]),
});

export type Entry = z.infer<typeof entrySchema>;
export type Offer = z.infer<typeof offerSchema>;
export type Address = z.infer<typeof addressSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
