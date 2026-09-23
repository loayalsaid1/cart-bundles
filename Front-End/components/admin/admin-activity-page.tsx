"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAdminActivity } from "@/hooks/use-admin";
import type { ActivityLog } from "@/lib/schemas/activity";
import { AdminActivityTable } from "./admin-tables";
import { AdminActivityCharts } from "./admin-activity-charts";
import { AdminActivityFilters, type ActivityFilterState } from "./admin-activity-filters";
import { AdminActivityMetadataModal } from "./admin-activity-metadata-modal";
import { AdminMerchantModal } from "./admin-merchant-modal";
import { Button } from "@/components/ui/button";

const INITIAL_FILTERS: ActivityFilterState = {
  search: "",
  severity: "",
  actorType: "",
  merchantId: "",
};

const PAGE_SIZE = 50;

export function AdminActivityPage() {
  const t = useTranslations("Admin.activity");

  const [filters, setFilters] = useState<ActivityFilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState(0);
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  const [selectedMetadataLog, setSelectedMetadataLog] = useState<ActivityLog | null>(null);

  // 100% Backend-driven filter query parameters using Limit + 1 pagination
  const queryParams = useMemo(() => {
    return {
      severity: (filters.severity || undefined),
      actorType: (filters.actorType || undefined),
      search: filters.search || undefined,
      merchantId: filters.merchantId ? Number(filters.merchantId) : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
  }, [filters.severity, filters.actorType, filters.search, filters.merchantId, page]);

  const activity = useAdminActivity(queryParams);

  const logs = activity.data?.items ?? [];
  const hasMore = activity.data?.hasMore ?? false;

  const handleFilterChange = (updated: Partial<ActivityFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
    setPage(0);
  };

  const handleFilterReset = () => {
    setFilters(INITIAL_FILTERS);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Charts & KPI Section */}
      <AdminActivityCharts logs={logs} />

      {/* Backend Filter Bar */}
      <AdminActivityFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
      />

      {/* Activity Table & Empty States */}
      <div className="space-y-4">
        <AdminActivityTable
          rows={logs}
          isPending={activity.isPending}
          isError={activity.isError}
          onSelectMerchant={(id) => setSelectedMerchantId(id)}
          onViewMetadata={(log) => setSelectedMetadataLog(log)}
        />

        {/* Limit + 1 Paginated Navigation Controls */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            {t("pagination.showing", { count: String(logs.length) })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || activity.isPending}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              {t("pagination.prev")}
            </Button>
            <span className="font-semibold text-foreground">
              Page {page + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore || activity.isPending}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      </div>

      {/* JSON Metadata Inspection Modal */}
      <AdminActivityMetadataModal
        log={selectedMetadataLog}
        onClose={() => setSelectedMetadataLog(null)}
      />

      {/* Merchant Details Modal */}
      <AdminMerchantModal
        merchantId={selectedMerchantId}
        onClose={() => setSelectedMerchantId(null)}
      />
    </div>
  );
}
