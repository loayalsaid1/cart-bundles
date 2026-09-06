import { z } from "zod";

export const couponSchema = z.object({
  id: z.number(),
  code: z.string(),
  type: z.string(),
  amount: z.object({
      amount: z.number(),
      currency: z.string(),
    }),
  status: z.string(),
});

export type Coupon = z.infer<typeof couponSchema>;