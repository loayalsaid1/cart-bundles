import z from "zod";

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


export interface Category {
  id: number;
  name: string;
  slug?: string;
  parent_id?: number | null;
  thumbnail?: string | null;
  image?: string | { url?: string } | null;
}