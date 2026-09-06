import { z } from "zod";

export const couponSchema = z.object({
  id: z.number(),
  code: z.string(),
  type: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  status: z.string().optional(),
});

export type Coupon = z.infer<typeof couponSchema>;