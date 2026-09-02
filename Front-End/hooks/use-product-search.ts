"use client";

import { useQuery } from "@tanstack/react-query";
import { searchProducts } from "@/lib/api/products";

export function useProductSearch(keyword: string, enabled = true) {
  return useQuery({
    queryKey: ["products", "search", keyword],
    queryFn: () => searchProducts(keyword || undefined),
    enabled,
  });
}
