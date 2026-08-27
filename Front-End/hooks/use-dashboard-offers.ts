"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getDashboardOffers,
  type DashboardFilters,
} from "@/lib/api/offers";

export function useDashboardOffers(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["offers", "dashboard", filters],
    queryFn: () => getDashboardOffers(filters),
    placeholderData: keepPreviousData,
  });
}
