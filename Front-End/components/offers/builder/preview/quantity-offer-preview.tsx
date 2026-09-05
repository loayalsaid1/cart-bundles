"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { SmartPhone01Icon, MonitorDotIcon, Globe02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { tierUnitPrice } from "@/lib/utils/amount";
import type { QuantityOfferDraft } from "@/lib/schemas/quantity-offer";
import { resolvePreviewColors } from "@/lib/utils/preview-appearance";
import { useProductSearch } from "@/hooks/use-product-search";

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

  const { data: allProducts = [] } = useProductSearch("", true);
  const targetId = draft.targeting?.ids?.[0];
  const targetProduct = allProducts.find((p) => p.id === targetId);

  const displayImage = targetProduct?.thumbnail;
  const displayName = targetProduct?.name || t("preview.productName");
  const displayPrice = targetProduct?.price?.amount ?? unitPrice;

  const radius = draft.appearance?.borderRadiusPx ?? 12;
  const colors = resolvePreviewColors(draft.appearance?.colors);
  const lang = previewLocale;
  const isRtl = lang === "ar";
  const title = draft.info.title[lang] || draft.info.title.ar || "";
  const subtitle = draft.info.subtitle?.[lang] || draft.info.subtitle?.ar || "";
  const tiers = draft.settings.tiers;
  const round = draft.settings.roundPriceToNearestInteger;
  const showPerPiece = draft.settings.showPricePerPiece;

  const widgetStyle = {
    borderRadius: `${radius}px`,
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    color: colors.bodyText,
    padding: "16px",
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
        <div className="mb-3 overflow-hidden rounded-lg bg-muted">
          {displayImage ? (
            <img
              src={displayImage}
              alt={displayName}
              className="aspect-3/4 w-40 h-50 mx-auto object-cover"
            />
          ) : (
            <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
              {t("preview.productImage")}
            </div>
          )}
        </div>
        <p className="text-sm font-medium">{displayName}</p>
        <p className="text-lg font-bold">
          {formatter.number(displayPrice, { style: "currency", currency: "SAR" })}
        </p>

        {title && (
          <div className="mt-4 text-start" style={widgetStyle} dir={isRtl ? "rtl" : "ltr"}>
            <p className="mb-0.5 text-[15px] font-bold" style={{ color: colors.titleColor }}>
              {title}
            </p>
            {subtitle && (
              <p className="mb-3 text-[13px]" style={{ color: colors.mutedText }}>
                {subtitle}
              </p>
            )}
            <div className="space-y-2">
              {tiers.map((tier, i) => {
                const safeQty = Number.isFinite(tier.quantity) && tier.quantity > 0 ? tier.quantity : 1;
                const total = tierUnitPrice(unitPrice, safeQty, tier.pricingType, tier.discountAmount || 0, round) * safeQty;
                const savings = unitPrice * safeQty - total;
                const selected = tier.isSelectedByDefault ?? false;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-xs"
                    style={{
                      backgroundColor: selected ? colors.selectedTier : "transparent",
                      border: `1.5px solid ${selected ? colors.badgeBg : colors.cardBorder}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={selected}
                        readOnly
                        style={{ accentColor: colors.badgeBg }}
                      />
                      <div>
                        <span className="text-[13px] font-semibold" style={{ color: colors.bodyText }}>
                          {tier.mainTitle?.[lang] || tier.mainTitle?.ar || `${safeQty} x`}
                        </span>
                        {showPerPiece && (
                          <div className="text-[11px]" style={{ color: colors.mutedText }}>
                            {formatter.number(total / safeQty)} {t("preview.currency")} / pc
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tier.badgeText && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
                        >
                          {tier.badgeText}
                        </span>
                      )}
                      {savings > 0 && (
                        <span className="text-[12px] font-bold" style={{ color: colors.savings }}>
                          {lang === "ar" ? "وفر" : "Save"} {formatter.number(savings)} SAR
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              className="mt-4 w-full"
              size="sm"
              style={{ background: colors.badgeBg, color: colors.badgeText }}
            >
              {t("preview.addToCart")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
