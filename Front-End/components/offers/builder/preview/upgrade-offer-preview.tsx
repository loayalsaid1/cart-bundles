"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

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
  const baseProduct = allProducts.find(
    (p) => p.id === draft.settings.baseSallaProductId,
  );
  const upgradedProduct = allProducts.find(
    (p) => p.id === draft.settings.upgradeSallaProductId,
  );

  const basePrice = baseProduct?.price?.amount ?? unitPrice;
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
        return (
          <div style={cardStyle} className="p-[18px]">
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
            <div className="mt-3 overflow-hidden rounded-lg p-3 text-center" style={{ border: `1.5px solid ${colors.badgeBg}`, background: colors.selectedTier }}>
              <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-md bg-muted">
                {upImage ? (
                  <img src={upImage} alt={upName} className="h-full w-full object-cover" />
                ) : null}
                <span
                  className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs"
                  style={{ background: colors.badgeBg, color: colors.badgeText }}
                >
                  ✨ {t("upgrade.preview.badge", { defaultValue: "Upgrade" })}
                </span>
              </div>
              <p className="truncate text-[14px] font-bold" style={{ color: colors.bodyText }} title={upName}>
                {upName}
              </p>
              <p className="mt-0.5 text-[14px] font-extrabold" style={{ color: colors.titleColor }}>
                {money(upPrice)}
              </p>
            </div>
            {couponCode && (
              <p
                className="mt-3 rounded-md px-3 py-2 text-center text-[13px]"
                style={{ background: colors.selectedTier, color: colors.bodyText }}
              >
                {t("upgrade.preview.coupon", { code: couponCode })}
              </p>
            )}
            <Button
              className="mt-3 w-full font-bold"
              size="sm"
              style={{ background: colors.badgeBg, color: colors.badgeText }}
            >
              {t("upgrade.preview.upgrade")}
            </Button>
          </div>
        );
      }}
    </OfferPreviewFrame>
  );
}
