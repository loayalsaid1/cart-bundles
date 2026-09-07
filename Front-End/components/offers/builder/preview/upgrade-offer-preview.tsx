"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

import { OfferPreviewFrame } from "@/components/offers/builder/preview/offer-preview-frame";
import type { UpgradeOfferDraft } from "@/lib/schemas/upgrade-offer";
import { previewCardStyle, resolvePreviewColors } from "@/lib/utils/preview-appearance";
import { useProductSearch } from "@/hooks/use-product-search";

export function UpgradeOfferPreview({
  draft,
  unitPrice,
}: {
  draft: UpgradeOfferDraft;
  unitPrice: number;
}) {
  const t = useTranslations("Offers");
  const formatter = useFormatter();
  const couponCode = draft.settings.couponCode?.trim();
  const radius = draft.appearance?.borderRadiusPx ?? 12;
  const colors = resolvePreviewColors(draft.appearance?.colors);
  const cardStyle = previewCardStyle(draft.appearance?.colors, radius);

  const { data: allProducts = [] } = useProductSearch("", true);
  const targetId = draft.settings.baseSallaProductId || draft.targeting?.ids?.[0];
  const baseProduct = allProducts.find((p) => p.id === targetId);
  const upgradedProduct = allProducts.find(
    (p) => p.id === draft.settings.upgradeSallaProductId,
  );

  const basePrice = baseProduct?.price?.amount ?? unitPrice;
  const baseImage = baseProduct?.thumbnail;
  const baseName = baseProduct?.name || t("preview.productName");

  const upImage = upgradedProduct?.thumbnail;
  const upName = upgradedProduct?.name || t("upgrade.preview.upgradeName");
  const upPrice = upgradedProduct?.price?.amount ?? basePrice * 1.25;

  const money = (n: number) =>
    formatter.number(n, { style: "currency", currency: "SAR" });

  return (
    <OfferPreviewFrame>
      {({ lang }) => {
        const title = draft.info.title[lang] || draft.info.title.ar || "";
        const subtitle =
          draft.info.subtitle?.[lang] || draft.info.subtitle?.ar || "";
        const isAr = lang === "ar";
        return (
          <div className="space-y-3">
            {/* Base / Current Product Card with clear indication */}
            <div className="border bg-background p-2.5 space-y-1.5" style={{ borderRadius: radius }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {isAr ? "المنتج الحالي في السلة" : "Current Cart Product"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-14 aspect-[3/4] shrink-0 items-center justify-center overflow-hidden bg-muted text-[8px] text-muted-foreground border" style={{ borderRadius: radius }}>
                  {baseImage ? (
                    <img
                      src={baseImage}
                      alt={baseName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    t("preview.productImage")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground line-clamp-1" title={baseName}>
                    {baseName}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground mt-0.5">
                    {money(basePrice)}
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Upgrade Arrow Indicator */}
            <div className="flex justify-center -my-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs">
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
              </div>
            </div>

            {/* Upgrade Offer Widget Card */}
            <div style={cardStyle} className="p-4">
              {title && (
                <p className="text-[15px] font-bold" style={{ color: colors.titleColor }}>
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="mt-0.5 mb-3 text-[13px]" style={{ color: colors.mutedText }}>
                  {subtitle}
                </p>
              )}

              {/* Upgraded Product Details (Horizontal Layout with 3/4 aspect ratio image) */}
              <div
                className="mt-3 flex items-center gap-3 overflow-hidden p-2.5"
                style={{ border: `1.5px solid ${colors.badgeBg}`, background: colors.selectedTier, borderRadius: radius }}
              >
                <div className="relative h-20 aspect-[3/4] shrink-0 overflow-hidden bg-muted border" style={{ borderRadius: radius }}>
                  {upImage ? (
                    <img src={upImage} alt={upName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[8px] text-muted-foreground">
                      {t("preview.productImage")}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold shadow-xs"
                    style={{ background: colors.badgeBg, color: colors.badgeText }}
                  >
                    {t("upgrade.preview.badge")}
                  </span>
                  <p className="line-clamp-2 text-xs font-bold" style={{ color: colors.bodyText }} title={upName}>
                    {upName}
                  </p>
                  <p className="text-sm font-extrabold" style={{ color: colors.titleColor }}>
                    {money(upPrice)}
                  </p>
                </div>
              </div>

              {couponCode && (
                <p
                  className="mt-3 px-3 py-2 text-center text-[12px] font-medium"
                  style={{ background: colors.selectedTier, color: colors.bodyText, borderRadius: radius }}
                >
                  {t("upgrade.preview.coupon", { code: couponCode })}
                </p>
              )}
              <Button
                className="mt-3 w-full font-bold"
                size="sm"
                style={{ background: colors.badgeBg, color: colors.badgeText, borderRadius: radius }}
              >
                {t("upgrade.preview.upgrade")}
              </Button>
            </div>
          </div>
        );
      }}
    </OfferPreviewFrame>
  );
}
