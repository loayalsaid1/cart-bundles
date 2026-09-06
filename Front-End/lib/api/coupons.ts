import { z } from 'zod';
import { http } from '@/lib/http';

export const couponSchema = z.object({
  id: z.number(),
  code: z.string(),
  type: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  status: z.string().optional(),
});

export type Coupon = z.infer<typeof couponSchema>;

export async function searchCoupons(keyword?: string): Promise<Coupon[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  const data = await http<unknown>(`/salla/embed/coupons${qs}`);
  return z.array(couponSchema).parse(data);
}
