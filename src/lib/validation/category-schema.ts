import { z } from "zod";

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
});

export const categoriesFileSchema = z.array(categorySchema).min(1);

export type Category = z.infer<typeof categorySchema>;
