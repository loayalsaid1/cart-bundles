"use client";

import { useQuery } from "@tanstack/react-query";
import { searchCoupons } from "@/lib/api/coupons";

export function useCouponSearch(keyword: string, enabled = true) {
  return useQuery({
    queryKey: ["coupons", "search", keyword],
    queryFn: () => searchCoupons(keyword || undefined),
    enabled,
  });
}
