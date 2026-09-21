"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminMerchantDetail } from "@/hooks/use-admin";

interface AdminMerchantModalProps {
  merchantId: number | null;
  onClose: () => void;
}

export function AdminMerchantModal({
  merchantId,
  onClose,
}: AdminMerchantModalProps) {
  const t = useTranslations("Admin") as any;
  const detail = useAdminMerchantDetail(merchantId);

  const data = detail.data;
  const isOpen = merchantId !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg font-bold">
            {data?.avatar ? (
              <img
                src={data.avatar}
                alt={data.storeName ?? "Store"}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {data?.storeName?.[0]?.toUpperCase() ?? "S"}
              </div>
            )}
            <div>
              <div>{data?.storeName ?? (merchantId ? `#${merchantId}` : t("modal.title"))}</div>
              {merchantId && (
                <div className="text-xs font-normal text-muted-foreground">
                  ID: #{merchantId}
                </div>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>{t("modal.subtitle")}</DialogDescription>
        </DialogHeader>

        {detail.isPending || !data ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Store Information Grid */}
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/30">
              <div>
                <span className="text-muted-foreground">{t("modal.email")}:</span>
                <p className="font-medium truncate">{data.storeEmail ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("modal.domain")}:</span>
                <p className="font-medium truncate">
                  {data.storeDomain ? (
                    <a
                      href={data.storeDomain.startsWith("http") ? data.storeDomain : `https://${data.storeDomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {data.storeDomain}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("modal.status")}:</span>
                <p className="mt-0.5">
                  <Badge variant={data.isActive ? "default" : "destructive"}>
                    {data.uninstalledAt
                      ? t("modal.churned")
                      : data.isActive
                      ? t("connected")
                      : t("disconnected")}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("modal.tokenStatus")}:</span>
                <p className="mt-0.5 font-medium capitalize">{data.tokenStatus}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("modal.offers")}:</span>
                <p className="font-medium">
                  {data.offerCounts.active} {t("modal.activeOffers")} / {data.offerCounts.total} {t("modal.totalOffers")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("modal.lastWebhook")}:</span>
                <p className="font-medium">
                  {data.lastWebhookAt
                    ? new Date(data.lastWebhookAt).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>

            {/* Performance Stats */}
            <div>
              <h4 className="mb-2 text-sm font-semibold">{t("modal.statsTitle")}</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border p-2.5">
                  <div className="text-muted-foreground">{t("modal.impressions")}</div>
                  <div className="text-base font-bold">{data.stats.impressions.toLocaleString()}</div>
                </div>
                <div className="rounded-md border p-2.5">
                  <div className="text-muted-foreground">{t("modal.clicks")}</div>
                  <div className="text-base font-bold">{data.stats.clicks.toLocaleString()}</div>
                </div>
                <div className="rounded-md border p-2.5">
                  <div className="text-muted-foreground">{t("modal.addToCart")}</div>
                  <div className="text-base font-bold">{data.stats.addToCart.toLocaleString()}</div>
                </div>
                <div className="rounded-md border p-2.5">
                  <div className="text-muted-foreground">{t("modal.conversions")}</div>
                  <div className="text-base font-bold">
                    {data.stats.conversions.toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({data.stats.conversionsAttributed} {t("modal.attributed")})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
              <div className="text-muted-foreground">{t("modal.revenueAttributed")}</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                SAR {Number(data.stats.revenueAttributed).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {t("modal.revenueGenerated")}: SAR {Number(data.stats.revenueGenerated).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
