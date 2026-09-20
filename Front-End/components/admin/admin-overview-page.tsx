"use client";

import { useTranslations } from "next-intl";
import { useAdminOverview } from "@/hooks/use-admin";
import { KpiGrid, KpiSkeleton } from "./admin-kpi";
import { AdminErrorsTable } from "./admin-tables";

export function AdminOverviewPage() {
  const t = useTranslations("Admin");
  const overview = useAdminOverview();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {overview.isPending || !overview.data ? (
        <KpiSkeleton count={4} columns={4} />
      ) : (
        <KpiGrid
          columns={4}
          items={[
            {
              label: t("kpis.merchants"),
              value: String(overview.data.merchants.total),
            },
            {
              label: t("kpis.activeMerchants"),
              value: String(overview.data.merchants.active),
            },
            {
              label: t("kpis.offers"),
              value: String(overview.data.offers.total),
            },
            {
              label: t("kpis.webhooks"),
              value: String(overview.data.webhooksLast24h),
            },
          ]}
        />
      )}

      <AdminErrorsTable
        rows={overview.data?.recentErrors ?? []}
        isPending={overview.isPending || !overview.data}
      />
    </div>
  );
}
