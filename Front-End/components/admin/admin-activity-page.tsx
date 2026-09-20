"use client";

import { useTranslations } from "next-intl";
import { useAdminActivity } from "@/hooks/use-admin";
import { AdminActivityTable } from "./admin-tables";

export function AdminActivityPage() {
  const t = useTranslations("Admin");
  const activity = useAdminActivity();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("activity.title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>
      <AdminActivityTable
        rows={activity.data}
        isPending={activity.isPending}
        isError={activity.isError}
      />
    </div>
  );
}
