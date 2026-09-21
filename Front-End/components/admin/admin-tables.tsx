"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityLog } from "@/lib/schemas/activity";
import { Badge } from "@/components/ui/badge";
import { AdminSection, severityVariant } from "./admin-section";

export function AdminErrorsTable({
  rows,
  isPending,
}: {
  rows: Array<{
    id: number;
    merchantId: number | null;
    action: string;
    message: string | null;
    createdAt: string;
  }>;
  isPending: boolean;
}) {
  const t = useTranslations("Admin");
  return (
    <AdminSection
      title={t("errors.title")}
      isPending={isPending}
      isEmpty={rows.length === 0}
      emptyLabel={t("errors.empty")}
      skeletonRows={3}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.time")}</TableHead>
            <TableHead>{t("table.merchant")}</TableHead>
            <TableHead>{t("table.action")}</TableHead>
            <TableHead>{t("table.message")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>{row.merchantId ?? "—"}</TableCell>
              <TableCell className="font-medium">{row.action}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.message ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  );
}

export function AdminActivityTable({
  rows,
  isPending,
  isError,
}: {
  rows: ActivityLog[] | undefined;
  isPending: boolean;
  isError: boolean;
}) {
  const t = useTranslations("Admin");
  return (
    <AdminSection
      title={t("activity.title")}
      isPending={isPending}
      isEmpty={isError || !rows || rows.length === 0}
      emptyLabel={t("activity.empty")}
      skeletonRows={5}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.time")}</TableHead>
            <TableHead>{t("table.merchant")}</TableHead>
            <TableHead>{t("table.action")}</TableHead>
            <TableHead>{t("table.severity")}</TableHead>
            <TableHead>{t("table.message")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows ?? []).map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>{row.merchantId ?? "—"}</TableCell>
              <TableCell className="font-medium">{row.action}</TableCell>
              <TableCell>
                <Badge variant={severityVariant(row.severity)}>
                  {row.severity}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.message ?? row.entityType ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  );
}

export function AdminTopMerchantsTable({
  rows,
  isPending,
  onSelectMerchant,
}: {
  rows: Array<{
    merchantId: number;
    storeName: string | null;
    conversions: number;
    revenueAttributed: string;
  }>;
  isPending: boolean;
  onSelectMerchant?: (merchantId: number) => void;
}) {
  const t = useTranslations("Admin") as any;
  return (
    <AdminSection
      title={t("topMerchants.title")}
      isPending={isPending}
      isEmpty={rows.length === 0}
      emptyLabel={t("topMerchants.empty")}
      skeletonRows={3}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.merchant")}</TableHead>
            <TableHead>{t("topMerchants.conversions")}</TableHead>
            <TableHead>{t("topMerchants.revenueAttributed")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.merchantId}
              className={onSelectMerchant ? "cursor-pointer hover:bg-muted/50" : ""}
              onClick={() => onSelectMerchant?.(row.merchantId)}
            >
              <TableCell className="font-medium">
                {row.storeName ? (
                  <span>
                    {row.storeName}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (#{row.merchantId})
                    </span>
                  </span>
                ) : (
                  `#${row.merchantId}`
                )}
              </TableCell>
              <TableCell>{row.conversions.toLocaleString()}</TableCell>
              <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                SAR{" "}
                {Number(row.revenueAttributed).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  );
}
