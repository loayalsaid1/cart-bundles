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
