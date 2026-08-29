"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { SmartPhone01Icon, MonitorDotIcon, Globe02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { tierUnitPrice } from "@/lib/utils/amount";
import type { QuantityOfferDraft } from "@/lib/schemas/quantity-offer";

type Device = "mobile" | "desktop";
type PreviewLocale = "ar" | "en";

export function QuantityOfferPreview({
  draft,
  unitPrice,
}: {
  draft: QuantityOfferDraft;
  unitPrice: number;
}) {
  const t = useTranslations("Offers");
  const formatter = useFormatter();
  const locale = useLocale() as PreviewLocale;
  const [device, setDevice] = useState<Device>("desktop");
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>(locale);

  const radius = draft.appearance?.borderRadiusPx ?? 12;
  const colors = draft.appearance?.colors ?? {};
  const lang = previewLocale;
  const title = draft.info.title[lang] || draft.info.title.ar || "";
  const subtitle = draft.info.subtitle?.[lang] || draft.info.subtitle?.ar || "";
  const tiers = draft.settings.tiers;
  const round = draft.settings.roundPriceToNearestInteger;
  const showPerPiece = draft.settings.showPricePerPiece;

  const style = {
    borderRadius: `${radius}px`,
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  } as React.CSSProperties;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("preview.title")}</p>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
              size="icon"
              variant={device === "mobile" ? "secondary" : "ghost"}
              onClick={() => setDevice("mobile")}
              aria-label={t("preview.mobile")}
            >
              <HugeiconsIcon icon={SmartPhone01Icon} size={14} />
            </Button>
            <Button
              size="icon"
              variant={device === "desktop" ? "secondary" : "ghost"}
              onClick={() => setDevice("desktop")}
              aria-label={t("preview.desktop")}
            >
              <HugeiconsIcon icon={MonitorDotIcon} size={14} />
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setPreviewLocale(lang === "ar" ? "en" : "ar")}
            aria-label={t("preview.locale")}
          >
            <HugeiconsIcon icon={Globe02Icon} size={14} />
          </Button>
        </div>
      </div>

      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className={cn(
          "rounded-xl border bg-background p-4 transition-all",
          device === "mobile" ? "mx-auto w-[300px]" : "w-full",
        )}
      >
        <div className="mb-3 rounded-lg bg-muted">
          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
            {t("preview.productImage")}
          </div>
        </div>
        <p className="text-sm font-medium">{t("preview.productName")}</p>
        <p className="text-lg font-bold">
          {formatter.number(unitPrice, { style: "currency", currency: "SAR" })}
        </p>

        {title && (
          <div className="mt-4" style={style}>
            <div
              className="p-3"
              style={{ border: `1px solid ${colors.cardBorder || '#e2e8f0'}`, borderRadius: `${radius}px` }}
            >
              {title && (
                <p className="text-sm font-semibold" style={{ color: colors.selectedTier || undefined }}>
                  {title}
                </p>
              )}
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
              <div className="mt-3 space-y-2">
                {tiers.map((tier, i) => {
                  const safeQty = Number.isFinite(tier.quantity) && tier.quantity > 0 ? tier.quantity : 1;
                  const total = tierUnitPrice(unitPrice, safeQty, tier.pricingType, tier.discountAmount || 0, round) * safeQty;
                  const savings = unitPrice * safeQty - total;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-xs"
                      style={{
                        backgroundColor: tier.isSelectedByDefault ? colors.selectedTier : undefined,
                        border: `1px solid ${tier.isSelectedByDefault ? (colors.cardBorder || '#e2e8f0') : "transparent"}`,
                      }}
                    >
                      <span>
                        {safeQty} × {showPerPiece ? `${formatter.number(total / safeQty)} ${t("preview.currency")}` : ""}
                      </span>
                      {tier.badgeText && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px]"
                          style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
                        >
                          {tier.badgeText}
                        </span>
                      )}
                      <span style={{ color: colors.savings }}>
                        {t("preview.save", {
                          amount: formatter.number(Math.max(0, savings || 0)),
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Button className="mt-3 w-full" size="sm">
                {t("preview.addToCart")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
