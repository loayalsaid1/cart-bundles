"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OfferPreviewFrame } from "@/components/offers/builder/preview/offer-preview-frame";
import type { AddonOfferDraft } from "@/lib/schemas/addon-offer";
import { previewCardStyle, resolvePreviewColors } from "@/lib/utils/preview-appearance";
import { useProductSearch } from "@/hooks/use-product-search";

export function AddonOfferPreview({
  draft,
  unitPrice,
}: {
  draft: AddonOfferDraft;
  unitPrice: number;
}) {
  const t = useTranslations("Offers");
  const formatter = useFormatter();
  const radius = draft.appearance?.borderRadiusPx ?? 12;
  const colors = resolvePreviewColors(draft.appearance?.colors);
  const items = draft.settings.relatedProducts;
  const orientation = draft.settings.displayOrientation ?? "horizontal";
  const maxItems = draft.settings.maxItems ?? 8;
  const discountType = draft.settings.discountType;
  const discountAmount = draft.settings.discountAmount ?? 0;
  const cardStyle = previewCardStyle(draft.appearance?.colors, radius);

  const { data: allProducts = [] } = useProductSearch("", true);
  const visibleItems = items.slice(0, Math.max(1, maxItems));

  const discounted = (price: number) => {
    if (!discountType) return price;
    if (discountType === "free-product") return 0;
    if (discountType === "percentage") {
      return Math.max(0, price * (1 - discountAmount / 100));
    }
    return price;
  };

  const money = (n: number) =>
    formatter.number(n, { style: "currency", currency: "SAR" });

  return (
    <OfferPreviewFrame>
      {({ lang }) => {
        const title = draft.info.title[lang] || draft.info.title.ar || "";
        const subtitle =
          draft.info.subtitle?.[lang] || draft.info.subtitle?.ar || "";
        return (
          <div style={cardStyle} className="p-4">
            {title && (
              <p className="text-[15px] font-bold" style={{ color: colors.titleColor }}>
                {title}
              </p>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[13px]" style={{ color: colors.mutedText }}>
                {subtitle}
              </p>
            )}
            {visibleItems.length > 0 && (
              <div
                className={
                  orientation === "horizontal"
                    ? "mt-3 flex gap-2.5 overflow-x-auto pb-2"
                    : "mt-3 space-y-2.5"
                }
              >
                {visibleItems.map((item, i) => {
                  const matchedProduct = allProducts.find(
                    (p) => p.id === item.sallaProductId,
                  );
                  const origPrice =
                    matchedProduct?.price?.amount ?? unitPrice * 0.6 + i * 10;
                  const itemPrice = discounted(origPrice);
                  const itemThumb = matchedProduct?.thumbnail;
                  const itemName =
                    matchedProduct?.name ||
                    t("addon.preview.addonName", { index: String(i + 1) });
                  const onSale = itemPrice < origPrice;

                  return (
                    <div
                      key={item.sallaProductId}
                      className={
                        orientation === "horizontal"
                          ? "w-[150px] shrink-0 overflow-hidden p-2.5"
                          : "w-full overflow-hidden p-2.5"
                      }
                      style={{
                        borderRadius: `${Math.max(4, radius - 4)}px`,
                        border: `1px solid ${colors.cardBorder}`,
                        background: "#ffffff",
                      }}
                    >
                      <div className="relative mb-3 aspect-3/4 overflow-hidden rounded-md bg-muted">
                        {onSale && (
                          <span
                            className="absolute start-1.5 top-1.5 z-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ background: "#ef4444" }}
                          >
                            {lang === "ar" ? "خصم" : "Sale"}
                          </span>
                        )}
                        {itemThumb ? (
                          <img
                            src={itemThumb}
                            alt={itemName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-full items-center justify-center text-[10px]"
                            style={{ color: colors.mutedText }}
                          >
                            {t("preview.productImage")}
                          </div>
                        )}
                      </div>
                      <p
                        className="mb-2 line-clamp-2 h-[2.4em] text-[12px] font-semibold"
                        style={{ color: colors.bodyText }}
                        title={itemName}
                      >
                        {itemName}
                      </p>
                      <p className="text-[14px] font-bold" style={{ color: colors.badgeBg }}>
                        {money(itemPrice)}
                      </p>
                      {onSale && (
                        <p className="text-[11px] line-through text-slate-400">
                          {money(origPrice)}
                        </p>
                      )}
                      <Button
                        size="sm"
                        className="mt-3 h-8 w-full text-[12px] font-semibold"
                        style={{ background: colors.badgeBg, color: colors.badgeText }}
                      >
                        {t("addon.preview.add")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }}
    </OfferPreviewFrame>
  );
}
