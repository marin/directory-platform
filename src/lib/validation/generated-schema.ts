import { z } from "zod";
import { faqItemSchema } from "./entry-schema.ts";

export const generatedIntroSchema = z.object({
  id: z.string().min(1),
  intro: z.string().min(1),
});

export const generatedFaqSchema = z.object({
  id: z.string().min(1),
  faq: z.array(faqItemSchema).min(1),
});

export type GeneratedIntro = z.infer<typeof generatedIntroSchema>;
export type GeneratedFaq = z.infer<typeof generatedFaqSchema>;
