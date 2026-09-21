"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAdminOverview } from "@/hooks/use-admin";
import { KpiGrid, KpiSkeleton } from "./admin-kpi";
import { AdminErrorsTable, AdminTopMerchantsTable } from "./admin-tables";
import { AdminHealthBanner } from "./admin-health-banner";
import { AdminOverviewCharts } from "./admin-overview-charts";
import { AdminQuickActions } from "./admin-quick-actions";
import { AdminMerchantModal } from "./admin-merchant-modal";

export function AdminOverviewPage() {
  const t = useTranslations("Admin") as any;
  const overview = useAdminOverview();
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);

  const data = overview.data;
  const failedJobsCount =
    data && data.queueHealth
      ? data.queueHealth.webhooksFailed +
        data.queueHealth.activityFailed +
        data.queueHealth.storefrontFailed
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
          failedJobs={failedJobsCount}
        />
      )}

      {overview.isPending || !data ? (
        <KpiSkeleton count={5} columns={5} />
      ) : (
        <KpiGrid
          columns={5}
          items={[
            {
              label: t("kpis.revenue"),
              value: `SAR ${Number(data.revenueAttributed ?? "0").toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            },
            {
              label: t("kpis.activeMerchants"),
              value: `${data.merchants.active} / ${data.merchants.total}`,
            },
            {
              label: t("kpis.conversions"),
              value: (data.conversions ?? 0).toLocaleString(),
            },
            {
              label: t("kpis.failedJobs"),
              value: String(failedJobsCount),
            },
            {
              label: t("kpis.offers"),
              value: `${data.offers.active} / ${data.offers.total}`,
            },
          ]}
        />
      )}

      {data && (
        <AdminTopMerchantsTable
          rows={data.topMerchants ?? []}
          isPending={overview.isPending}
          onSelectMerchant={(id) => setSelectedMerchantId(id)}
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

      <AdminMerchantModal
        merchantId={selectedMerchantId}
        onClose={() => setSelectedMerchantId(null)}
      />
    </div>
  );
}
