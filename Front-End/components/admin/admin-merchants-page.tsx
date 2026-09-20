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
import { Badge } from "@/components/ui/badge";
import { useAdminMerchants } from "@/hooks/use-admin";
import { AdminSection } from "./admin-section";

export function AdminMerchantsPage() {
  const t = useTranslations("Admin");
  const merchants = useAdminMerchants();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("merchants.title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>
      <AdminSection
        title={t("merchants.title")}
        isPending={merchants.isPending}
        isEmpty={merchants.isError || !merchants.data || merchants.data.length === 0}
        emptyLabel={t("merchants.empty")}
        skeletonRows={5}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.merchant")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.offers")}</TableHead>
              <TableHead>{t("table.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(merchants.data ?? []).map((row) => (
              <TableRow key={row.merchantId}>
                <TableCell className="font-medium">{row.merchantId}</TableCell>
                <TableCell>
                  <Badge variant={row.isActive ? "default" : "destructive"}>
                    {row.isActive ? t("connected") : t("disconnected")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.offerCounts.active}/{row.offerCounts.total}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminSection>
    </div>
  );
}
