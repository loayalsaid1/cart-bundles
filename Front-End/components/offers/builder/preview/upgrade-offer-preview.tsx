"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRightIcon } from "@hugeicons/core-free-icons";
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
  const targetId = draft.targeting?.ids?.[0] || draft.settings.baseSallaProductId;
  const targetProduct = allProducts.find((p) => p.id === targetId);
  const upgradedProduct = allProducts.find(
    (p) => p.id === draft.settings.upgradeSallaProductId,
  );

  const origImage = targetProduct?.thumbnail;
  const origName = targetProduct?.name || t("preview.productName");
  const origPrice = targetProduct?.price?.amount ?? unitPrice;

  const upImage = upgradedProduct?.thumbnail;
  const upName = upgradedProduct?.name || t("upgrade.preview.upgradeName");
  const upPrice = upgradedProduct?.price?.amount ?? origPrice * 1.25;

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
            <div className="flex items-center gap-3">
              <div
                className="min-w-0 flex-1 p-2.5 text-center"
                style={{
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "8px",
                }}
              >
                <div className="mb-2 aspect-square overflow-hidden rounded-md bg-muted">
                  {origImage ? (
                    <img src={origImage} alt={origName} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <p className="truncate text-[13px] font-semibold" style={{ color: colors.bodyText }} title={origName}>
                  {origName}
                </p>
                <p className="text-[13px]" style={{ color: colors.mutedText }}>
                  {money(origPrice)}
                </p>
              </div>
              <HugeiconsIcon
                icon={ArrowRightIcon}
                size={18}
                className="shrink-0 rtl:rotate-180"
                style={{ color: colors.mutedText }}
              />
              <div
                className="min-w-0 flex-1 p-2.5 text-center"
                style={{
                  border: `1.5px solid ${colors.badgeBg}`,
                  borderRadius: "8px",
                  background: colors.selectedTier,
                }}
              >
                <div className="mb-2 aspect-square overflow-hidden rounded-md bg-muted">
                  {upImage ? (
                    <img src={upImage} alt={upName} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <p className="truncate text-[13px] font-semibold" style={{ color: colors.bodyText }} title={upName}>
                  {upName}
                </p>
                <p className="text-[13px] font-bold" style={{ color: colors.bodyText }}>
                  {money(upPrice)}
                </p>
              </div>
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
