import { z } from "zod";

export const redirectSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  status: z.literal(301).optional().default(301),
});

export const redirectsFileSchema = z.array(redirectSchema);

export type Redirect = z.infer<typeof redirectSchema>;
