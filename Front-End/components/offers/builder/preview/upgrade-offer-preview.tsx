"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRightIcon } from "@hugeicons/core-free-icons";
import { OfferPreviewFrame } from "@/components/offers/builder/preview/offer-preview-frame";
import type { UpgradeOfferDraft } from "@/lib/schemas/upgrade-offer";

export function UpgradeOfferPreview({
  draft,
  unitPrice,
}: {
  draft: UpgradeOfferDraft;
  unitPrice: number;
}) {
  const t = useTranslations("Offers");
  const formatter = useFormatter();
  const upgradePrice = unitPrice * 1.25;
  const couponCode = draft.settings.couponCode?.trim();

  return (
    <OfferPreviewFrame>
      {({ lang }) => {
        const title = draft.info.title[lang] || draft.info.title.ar || "";
        const subtitle =
          draft.info.subtitle?.[lang] || draft.info.subtitle?.ar || "";
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
                  {t("preview.productImage")}
                </div>
                <p className="text-xs font-medium">{t("preview.productName")}</p>
                <p className="text-xs text-muted-foreground">
                  {formatter.number(unitPrice, {
                    style: "currency",
                    currency: "SAR",
                  })}
                </p>
              </div>
              <HugeiconsIcon icon={ArrowRightIcon} size={18} className="shrink-0 text-muted-foreground rtl:rotate-180" />
              <div className="flex-1">
                <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-primary/10 text-[10px] text-primary">
                  {t("preview.productImage")}
                </div>
                <p className="text-xs font-medium">
                  {t("upgrade.preview.upgradeName")}
                </p>
                <p className="text-xs font-bold text-primary">
                  {formatter.number(upgradePrice, {
                    style: "currency",
                    currency: "SAR",
                  })}
                </p>
              </div>
            </div>

            {title && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-semibold">{title}</p>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {couponCode && (
              <p className="rounded-md bg-muted px-3 py-2 text-center text-xs">
                {t("upgrade.preview.coupon", { code: couponCode })}
              </p>
            )}

            <Button className="w-full" size="sm">
              {t("upgrade.preview.upgrade")}
            </Button>
          </div>
        );
      }}
    </OfferPreviewFrame>
  );
}
