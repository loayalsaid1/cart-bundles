"use client";

import { useQuery } from "@tanstack/react-query";
import { searchCategories } from "@/lib/api/categories";

export function useCategorySearch(keyword: string, enabled = true) {
  return useQuery({
    queryKey: ["categories", "search", keyword],
    queryFn: () => searchCategories(keyword || undefined),
    enabled,
  });
}
