"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  useAdminActivity,
  useAdminLogout,
  useAdminOverview,
} from "@/hooks/use-admin";
import { AdminLoginForm } from "./admin-login-form";
import { KpiGrid, KpiSkeleton } from "./admin-kpi";
import { AdminActivityTable, AdminErrorsTable } from "./admin-tables";
import { AdminSuggestionsTable } from "./admin-suggestions-table";

export function AdminConsole() {
  const t = useTranslations("Admin");
  const overview = useAdminOverview();
  const activity = useAdminActivity();
  const logout = useAdminLogout();

  if (overview.isError) {
    return <AdminLoginForm />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {t("logout")}
        </Button>
      </div>

      {overview.isPending || !overview.data ? (
        <KpiSkeleton count={5} />
      ) : (
        <KpiGrid
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
            {
              label: t("kpis.redis"),
              value: overview.data.redisConnected
                ? t("connected")
                : t("disconnected"),
            },
          ]}
        />
      )}

      <AdminErrorsTable
        rows={overview.data?.recentErrors ?? []}
        isPending={overview.isPending || !overview.data}
      />

      <AdminActivityTable
        rows={activity.data}
        isPending={activity.isPending}
        isError={activity.isError}
      />

      <AdminSuggestionsTable />
    </div>
  );
}
