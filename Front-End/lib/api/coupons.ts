import { z } from 'zod';
import { http } from '@/lib/http';
import { Coupon, couponSchema } from '../schemas/coupons';


export async function searchCoupons(keyword?: string): Promise<Coupon[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  const data = await http<unknown>(`/salla/embed/coupons${qs}`);
  return z.array(couponSchema).parse(data);
}
