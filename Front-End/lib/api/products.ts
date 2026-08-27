import { z } from 'zod';
import { http } from '@/lib/http';

export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string().optional(),
  thumbnail: z.string().nullable().optional(),
  price: z.object({
    amount: z.coerce.number(),
    currency: z.string().optional(),
  }),
});

export type CatalogProduct = z.infer<typeof productSchema>;

export async function searchProducts(query?: string): Promise<CatalogProduct[]> {
  const qs = query ? `?query=${encodeURIComponent(query)}` : '';
  const data = await http<unknown>(`/salla/embed/products${qs}`);
  return z.array(productSchema).parse(data);
}
