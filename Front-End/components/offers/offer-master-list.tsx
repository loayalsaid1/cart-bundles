"use client";

import { useState, useDeferredValue } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { useDashboardOffers } from "@/hooks/use-dashboard-offers";
import { OfferKindBadge } from "@/components/offers/offer-kind-badge";
import { OfferStatusToggle } from "@/components/offers/offer-status-toggle";
import { OfferActionsMenu } from "@/components/offers/offer-actions-menu";
import { offerKindSchema, type OfferKind, type OfferStatus } from "@/lib/schemas/common-offer";

const STATUS_TABS: Array<OfferStatus | "all"> = ["all", "active", "draft", "paused", "expired"];

export function OfferMasterList() {
  const t = useTranslations("Offers");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [kind, setKind] = useState<OfferKind | "all">("all");
  const [status, setStatus] = useState<OfferStatus | "all">("all");

  const { data, isPending, isError, refetch } = useDashboardOffers({
    search: deferredSearch || undefined,
    type: kind === "all" ? undefined : kind,
    status: status === "all" ? undefined : status,
  });

  const activeCount = data?.filter((o) => o.status === "active").length ?? 0;
  const targetsCount = data?.reduce((acc, o) => acc + o.targetsCount, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("masterList.title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("masterList.subtitle")}</p>
        </div>
        <Button size="lg" onClick={() => router.push("/salla/embed/offers/new")}>
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          {t("masterList.newOffer")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label={t("masterList.kpis.active")} value={String(activeCount)} />
        <KpiCard label={t("masterList.kpis.targeted")} value={String(targetsCount)} />
        <KpiCard label={t("masterList.kpis.revenue")} value={t("masterList.kpis.na")} />
        <KpiCard label={t("masterList.kpis.conversion")} value={t("masterList.kpis.na")} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <HugeiconsIcon icon={Search01Icon} size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("masterList.filters.searchPlaceholder")}
            className="ps-9"
          />
        </div>
        <Select value={kind} onValueChange={(v) => setKind(v as OfferKind | "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("masterList.filters.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("masterList.filters.allTypes")}</SelectItem>
            {offerKindSchema.options.slice(0, 2).map((k) => (
              <SelectItem key={k} value={k}>
                {t(`kind.${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1 border-b pb-px">
        {STATUS_TABS.map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            className={status === s ? "border-b-2 border-primary text-foreground font-medium" : "text-muted-foreground"}
            onClick={() => setStatus(s)}
          >
            {s === "all" ? t("masterList.tabs.all") : t(`status.${s}`)}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border">
        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 p-10">
            <p className="text-sm text-muted-foreground">{t("masterList.error")}</p>
            <Button variant="outline" onClick={() => refetch()}>
              {t("masterList.retry")}
            </Button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("masterList.empty")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("masterList.table.name")}</TableHead>
                <TableHead>{t("masterList.table.targets")}</TableHead>
                <TableHead>{t("masterList.table.status")}</TableHead>
                <TableHead>{t("masterList.table.expiry")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <OfferKindBadge kind={offer.kind} />
                      <span className="font-medium">{offer.internalName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {offer.targetsCount === 0
                      ? t("masterList.targets.all")
                      : t("masterList.targets.count", { count: offer.targetsCount })}
                  </TableCell>
                  <TableCell>
                    <OfferStatusToggle offerId={offer.id} status={offer.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {offer.expiryDate
                      ? new Date(offer.expiryDate).toLocaleDateString()
                      : t("masterList.never")}
                  </TableCell>
                  <TableCell>
                    <OfferActionsMenu offer={offer} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-card-foreground">{value}</p>
    </div>
  );
}
