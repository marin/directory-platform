import { z } from "zod";

export const associationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  abbreviation: z.string().min(1).optional(),
  synonyms: z.array(z.string().min(2)).min(1),
  forbidIfPrecededBy: z.array(z.string().min(1)).optional(),
});

export const associationsFileSchema = z.array(associationSchema).min(1);

export type Association = z.infer<typeof associationSchema>;
