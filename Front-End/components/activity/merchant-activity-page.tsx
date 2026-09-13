"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActivityLogs, useMerchantHealth } from "@/hooks/use-merchant-activity";
import type { ActivityLog, MerchantHealth } from "@/lib/schemas/activity";

function tokenBadge(status: MerchantHealth["tokenStatus"]) {
  if (status === "valid") return "default" as const;
  if (status === "expiring") return "outline" as const;
  return "destructive" as const;
}

function severityBadge(severity: ActivityLog["severity"]) {
  if (severity === "error") return "destructive" as const;
  if (severity === "warn") return "outline" as const;
  return "secondary" as const;
}

export function MerchantActivityPage() {
  const t = useTranslations("Activity");
  const health = useMerchantHealth();
  const logs = useActivityLogs();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {health.isPending ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : health.isError || !health.data ? (
        <p className="text-sm text-muted-foreground">{t("error")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label={t("kpis.activeOffers")} value={String(health.data.offerCounts.active)} />
            <Kpi label={t("kpis.impressions")} value={String(health.data.stats.impressions)} />
            <Kpi label={t("kpis.clicks")} value={String(health.data.stats.clicks)} />
            <Kpi label={t("kpis.conversions")} value={String(health.data.stats.conversions)} />
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm">
            <span className="text-muted-foreground">{t("connection")}</span>
            <Badge variant={health.data.isActive ? "default" : "destructive"}>
              {health.data.isActive ? t("active") : t("inactive")}
            </Badge>
            <Badge variant={tokenBadge(health.data.tokenStatus)}>
              {t(`token.${health.data.tokenStatus}`)}
            </Badge>
            <span className="text-muted-foreground">
              {t("lastWebhook")}: {health.data.lastWebhookEvent ?? t("never")}
            </span>
          </div>
        </>
      )}

      <div className="rounded-lg border">
        {logs.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : logs.isError || !logs.data || logs.data.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.time")}</TableHead>
                <TableHead>{t("table.action")}</TableHead>
                <TableHead>{t("table.severity")}</TableHead>
                <TableHead>{t("table.message")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{row.action}</TableCell>
                  <TableCell>
                    <Badge variant={severityBadge(row.severity)}>{row.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.message ?? row.entityType ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-card-foreground">{value}</p>
    </div>
  );
}
