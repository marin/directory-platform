import { z } from "zod";

export const areaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
});

export const areasFileSchema = z.array(areaSchema);

export type Area = z.infer<typeof areaSchema>;
