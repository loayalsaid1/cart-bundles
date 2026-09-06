import { http } from "@/lib/http";
import { Category } from "../schemas/common-products";


export async function searchCategories(keyword?: string): Promise<Category[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
  return http<Category[]>(`/salla/embed/categories${qs}`);
}
