"use client";

import { useTranslations } from "next-intl";
import { useAdminOverview } from "@/hooks/use-admin";
import { KpiGrid, KpiSkeleton } from "./admin-kpi";
import { AdminErrorsTable } from "./admin-tables";
import { AdminHealthBanner } from "./admin-health-banner";
import { AdminOverviewCharts } from "./admin-overview-charts";
import { AdminQuickActions } from "./admin-quick-actions";

export function AdminOverviewPage() {
  const t = useTranslations("Admin");
  const overview = useAdminOverview();

  const data = overview.data;
  const activeMerchantRatio =
    data && data.merchants.total > 0
      ? Math.round((data.merchants.active / data.merchants.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {data && (
        <AdminHealthBanner
          status={data.systemHealth?.status ?? "healthy"}
          errorCount24h={data.systemHealth?.errorCount24h ?? 0}
        />
      )}

      {overview.isPending || !data ? (
        <KpiSkeleton count={5} columns={5} />
      ) : (
        <KpiGrid
          columns={5}
          items={[
            {
              label: t("kpis.merchants"),
              value: String(data.merchants.total),
            },
            {
              label: t("kpis.activeMerchants"),
              value: `${data.merchants.active} (${activeMerchantRatio}%)`,
            },
            {
              label: t("kpis.zeroOffers"),
              value: String(data.merchants.zeroOffersCount ?? 0),
            },
            {
              label: t("kpis.offers"),
              value: `${data.offers.active} / ${data.offers.total}`,
            },
            {
              label: t("kpis.webhooks"),
              value: String(data.webhooksLast24h),
            },
          ]}
        />
      )}

      {data && (
        <AdminOverviewCharts
          dailyPerformance={data.dailyPerformance ?? []}
          kindBreakdown={data.offers.kindBreakdown ?? {}}
        />
      )}

      <AdminQuickActions />

      <AdminErrorsTable
        rows={overview.data?.recentErrors ?? []}
        isPending={overview.isPending || !overview.data}
      />
    </div>
  );
}
