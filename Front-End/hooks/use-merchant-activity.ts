"use client";

import { useQuery } from "@tanstack/react-query";
import { getActivityLogs, getMerchantHealth } from "@/lib/api/activity";

export function useMerchantHealth() {
  return useQuery({
    queryKey: ["activity", "status"],
    queryFn: getMerchantHealth,
    refetchInterval: 30_000,
  });
}

export function useActivityLogs() {
  return useQuery({
    queryKey: ["activity", "logs"],
    queryFn: () => getActivityLogs({ limit: 50 }),
  });
}
