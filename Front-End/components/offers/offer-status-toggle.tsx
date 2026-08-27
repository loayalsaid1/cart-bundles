"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { useOfferStatus } from "@/hooks/use-offer-status";
import type { OfferStatus } from "@/lib/schemas/common-offer";

export function OfferStatusToggle({
  offerId,
  status,
}: {
  offerId: number;
  status: OfferStatus;
}) {
  const t = useTranslations("Offers");
  const toggle = useOfferStatus();
  const isActive = status === "active";

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isActive}
        disabled={status === "expired"}
        onCheckedChange={(checked) =>
          toggle.mutate({
            id: offerId,
            status: checked ? "active" : "paused",
          })
        }
        aria-label={t("masterList.status.label")}
      />
      <span className="text-xs text-muted-foreground">
        {t(`status.${isActive ? "active" : status}`)}
      </span>
    </div>
  );
}
