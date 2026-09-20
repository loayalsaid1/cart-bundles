"use client";

import { useTranslations } from "next-intl";
import { AdminSuggestionsTable } from "./admin-suggestions-table";

export function AdminSuggestionsPage() {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("suggestions.title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>
      <AdminSuggestionsTable />
    </div>
  );
}
