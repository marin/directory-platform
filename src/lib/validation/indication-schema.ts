import { z } from "zod";

export const indicationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  synonyms: z.array(z.string().min(2)).min(1),
});

export const indicationsFileSchema = z.array(indicationSchema).min(1);

export type Indication = z.infer<typeof indicationSchema>;
