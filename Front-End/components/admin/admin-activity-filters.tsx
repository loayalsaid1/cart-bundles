"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ActivityFilterState {
  search: string;
  severity: string;
  actorType: string;
  merchantId: string;
}

export function AdminActivityFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: ActivityFilterState;
  onChange: (updated: Partial<ActivityFilterState>) => void;
  onReset: () => void;
}) {
  const t = useTranslations("Admin.activity");

  const isFiltered =
    filters.search || filters.severity || filters.actorType || filters.merchantId;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
      {/* Search Bar */}
      <div className="min-w-[200px] flex-1">
        <Input
          type="text"
          placeholder={t("filters.searchPlaceholder")}
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="h-9 text-xs"
        />
      </div>

      {/* Severity Select */}
      <select
        value={filters.severity}
        onChange={(e) => onChange({ severity: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">{t("filters.allSeverities")}</option>
        <option value="info">{t("severities.info")}</option>
        <option value="warn">{t("severities.warn")}</option>
        <option value="error">{t("severities.error")}</option>
      </select>

      {/* Actor Type Select */}
      <select
        value={filters.actorType}
        onChange={(e) => onChange({ actorType: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">{t("filters.allActors")}</option>
        <option value="merchant">{t("actors.merchant")}</option>
        <option value="admin">{t("actors.admin")}</option>
        <option value="system">{t("actors.system")}</option>
        <option value="storefront">{t("actors.storefront")}</option>
        <option value="salla">{t("actors.salla")}</option>
      </select>

      {/* Merchant ID Input */}
      <div className="w-32">
        <Input
          type="number"
          placeholder={t("filters.merchantId")}
          value={filters.merchantId}
          onChange={(e) => onChange({ merchantId: e.target.value })}
          className="h-9 text-xs"
        />
      </div>

      {/* Reset Filters Button */}
      {isFiltered && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 text-xs">
          {t("filters.clear")}
        </Button>
      )}
    </div>
  );
}
