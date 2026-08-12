import { z } from "zod";

export const commercialCampaignSchema = z.object({
  id: z.string().min(1),
  listingSlug: z.string().min(1),
  plan: z.string().min(1),
  status: z.enum(["active", "paused", "ended"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  surfaces: z.array(z.string()),
  targeting: z
    .object({
      categoryIds: z.array(z.string()).optional(),
      areaIds: z.array(z.string()).optional(),
    })
    .optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

export const commercialCampaignsFileSchema = z.array(commercialCampaignSchema);

export type CommercialCampaign = z.infer<typeof commercialCampaignSchema>;
