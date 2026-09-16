"use client";

import { useQuery } from "@tanstack/react-query";
import { searchProducts } from "@/lib/api/products";

/**
 * Fetch the merchant catalog once and share it across pickers/previews.
 * Filter the result locally instead of issuing a request per keystroke.
 */
export function useProducts(enabled = true) {
  return useQuery({
    queryKey: ["products", "search", ""],
    queryFn: () => searchProducts(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * @deprecated Prefer `useProducts()` + local filtering. Kept for callers that
 * genuinely need a server-side keyword query.
 */
export function useProductSearch(keyword: string, enabled = true) {
  return useQuery({
    queryKey: ["products", "search", keyword],
    queryFn: () => searchProducts(keyword || undefined),
    enabled,
  });
}
