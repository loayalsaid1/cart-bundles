import { http } from "@/lib/http";

export interface Category {
  id: number;
  name: string;
  slug?: string;
  parent_id?: number | null;
  thumbnail?: string | null;
  image?: string | { url?: string } | null;
}

export async function searchCategories(keyword?: string): Promise<Category[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
  return http<Category[]>(`/salla/embed/categories${qs}`);
}
