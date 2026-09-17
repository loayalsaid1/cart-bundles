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

export interface ActivityLogFilters {
  action?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

export function useActivityLogs(filters: ActivityLogFilters = {}) {
  const { action, severity, limit = 50, offset = 0 } = filters;
  return useQuery({
    queryKey: ["activity", "logs", { action, severity, limit, offset }],
    queryFn: () => getActivityLogs({ action, severity, limit, offset }),
  });
}
