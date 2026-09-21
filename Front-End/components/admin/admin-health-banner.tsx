"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface AdminHealthBannerProps {
  status: "healthy" | "degraded";
  errorCount24h: number;
  failedJobs?: number;
}

export function AdminHealthBanner({
  status,
  errorCount24h,
}: AdminHealthBannerProps) {
  const t = useTranslations("Admin");
  const isHealthy = status === "healthy";

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 shadow-sm transition-all ${
        isHealthy
          ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10"
          : "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-3 w-3 rounded-full ${
            isHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
          }`}
        />
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            {isHealthy
              ? t("health.operational")
              : t("health.degraded")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isHealthy
              ? t("health.operationalSub")
              : t("health.degradedSub", { count: String(errorCount24h) })}
          </p>
        </div>
      </div>
      <Badge variant={isHealthy ? "outline" : "destructive"}>
        {isHealthy ? t("health.badgeHealthy") : t("health.badgeDegraded")}
      </Badge>
    </div>
  );
}
