"use client";

import { useState } from "react";
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
import { AdminMerchantModal } from "./admin-merchant-modal";

export function AdminMerchantsPage() {
  const t = useTranslations("Admin") as any;
  const merchants = useAdminMerchants();
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);

  const activeMerchants = (merchants.data ?? []).filter((row) => !row.uninstalledAt);
  const churnedMerchants = (merchants.data ?? []).filter((row) => !!row.uninstalledAt);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("merchants.title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Active Merchants Section */}
      <AdminSection
        title={t("merchants.activeTitle")}
        isPending={merchants.isPending}
        isEmpty={merchants.isError || activeMerchants.length === 0}
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
            {activeMerchants.map((row) => (
              <TableRow
                key={row.merchantId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedMerchantId(row.merchantId)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {row.avatar ? (
                      <img
                        src={row.avatar}
                        alt={row.storeName ?? "Store"}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {row.storeName?.[0]?.toUpperCase() ?? "S"}
                      </div>
                    )}
                    <div>
                      {row.storeName ?? t("merchants.unnamed")}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        (#{row.merchantId})
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={row.isActive ? "default" : "destructive"}>
                    {row.isActive ? t("connected") : t("disconnected")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.offerCounts.active} / {row.offerCounts.total}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminSection>

      {/* Churned Merchants Section */}
      <AdminSection
        title={t("merchants.churnedTitle")}
        isPending={merchants.isPending}
        isEmpty={merchants.isError || churnedMerchants.length === 0}
        emptyLabel={t("merchants.churnedEmpty")}
        skeletonRows={3}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.merchant")}</TableHead>
              <TableHead>{t("merchants.email")}</TableHead>
              <TableHead>{t("merchants.uninstalledAt")}</TableHead>
              <TableHead>{t("table.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {churnedMerchants.map((row) => (
              <TableRow
                key={row.merchantId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedMerchantId(row.merchantId)}
              >
                <TableCell className="font-medium">
                  {row.storeName ?? t("merchants.unnamed")}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (#{row.merchantId})
                  </span>
                </TableCell>
                <TableCell>{row.storeEmail ?? "—"}</TableCell>
                <TableCell className="text-xs text-destructive">
                  {row.uninstalledAt
                    ? new Date(row.uninstalledAt).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminSection>

      <AdminMerchantModal
        merchantId={selectedMerchantId}
        onClose={() => setSelectedMerchantId(null)}
      />
    </div>
  );
}
