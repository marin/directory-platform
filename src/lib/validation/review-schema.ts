import { z } from "zod";

export const reviewSchema = z.object({
  id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  author: z.string().min(1),
  text: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const reviewsFileSchema = z.array(reviewSchema);

export type Review = z.infer<typeof reviewSchema>;
