import { z } from 'zod';
import { http } from '@/lib/http';
import { CatalogProduct, productSchema } from '../schemas/common-products';


export async function searchProducts(query?: string): Promise<CatalogProduct[]> {
  const qs = query ? `?query=${encodeURIComponent(query)}` : '';
  const data = await http<unknown>(`/salla/embed/products${qs}`);
  return z.array(productSchema).parse(data);
}
