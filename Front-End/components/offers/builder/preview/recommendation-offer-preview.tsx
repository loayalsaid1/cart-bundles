"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OfferPreviewFrame } from "@/components/offers/builder/preview/offer-preview-frame";
import type { RecommendationOfferDraft } from "@/lib/schemas/recommendation-offer";
import { previewCardStyle, resolvePreviewColors } from "@/lib/utils/preview-appearance";
import { useProductSearch } from "@/hooks/use-product-search";

export function RecommendationOfferPreview({
  draft,
  unitPrice,
}: {
  draft: RecommendationOfferDraft;
  unitPrice: number;
}) {
  const t = useTranslations("Offers");
  const formatter = useFormatter();
  const radius = draft.appearance?.borderRadiusPx ?? 12;
  const colors = resolvePreviewColors(draft.appearance?.colors);
  const items = draft.settings.relatedProducts;
  const mode = draft.settings.mode;
  const cardStyle = previewCardStyle(draft.appearance?.colors, radius);

  const { data: allProducts = [] } = useProductSearch("", true);
  const targetId = draft.settings.triggerSallaProductId;
  const targetProduct = allProducts.find((p) => p.id === targetId);

  const displayImage = targetProduct?.thumbnail;
  const displayName = targetProduct?.name || t("preview.productName");

  return (
    <OfferPreviewFrame>
      {({ lang }) => {
        const title = draft.info.title[lang] || draft.info.title.ar || "";
        const subtitle =
          draft.info.subtitle?.[lang] || draft.info.subtitle?.ar || "";
        return (
          <div className="space-y-4">
            
            <div className="flex items-center gap-3 rounded-lg border p-2 bg-background/50">
              <div className="flex h-16 aspect-3/4 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-[8px] text-muted-foreground">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  t("preview.productImage")
                )}
              </div>
              <p className="text-xs font-medium text-foreground line-clamp-2">{displayName}</p>
            </div>

            <div style={cardStyle} className="p-3">
                {title && (
                  <p
                    className="text-sm font-semibold"
                    style={{ color: colors.titleColor }}
                  >
                    {title}
                  </p>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-xs" style={{ color: colors.mutedText }}>
                    {subtitle}
                  </p>
                )}
                
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {items.length > 0 ? (
                    items.map((item, i) => {
                      const matchedProduct = allProducts.find(
                        (p) => p.id === item.sallaProductId,
                      );
                      const price = matchedProduct?.price?.amount ?? (unitPrice * 0.7 + i * 9);
                      const itemThumb = matchedProduct?.thumbnail;
                      const itemName =
                        matchedProduct?.name ||
                        t("recommendation.preview.productName", { index: String(i + 1) });

                      return (
                        <div
                          key={item.sallaProductId}
                          className="overflow-hidden"
                          style={{
                            borderRadius: `${Math.max(0, radius - 4)}px`,
                            border: `1px solid ${colors.cardBorder}`,
                            background: "#ffffff",
                          }}
                        >
                          {/* 3/4 Aspect ratio image container */}
                          <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-muted text-[8px] text-muted-foreground border-b" style={{ borderColor: colors.cardBorder }}>
                            {itemThumb ? (
                              <img
                                src={itemThumb}
                                alt={itemName}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            ) : (
                              t("preview.productImage")
                            )}
                          </div>
                          <div className="p-2">
                            <p className="truncate text-[9px] font-medium" style={{ color: colors.bodyText }} title={itemName}>
                              {itemName}
                            </p>
                            <p className="text-[10px] mt-0.5 font-bold" style={{ color: colors.savings || colors.bodyText }}>
                              {formatter.number(price, {
                                style: "currency",
                                currency: "SAR",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="col-span-3 py-2 text-center text-xs text-muted-foreground">
                      {t("recommendation.preview.noProducts")}
                    </p>
                  )}
                </div>
                {mode === "cart_related" && (
                  <p className="mt-3 border-t pt-2 text-[10px] text-muted-foreground">
                    {t("recommendation.preview.cartHint")}
                  </p>
                )}
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    style={{ background: colors.badgeBg, color: colors.badgeText }}
                  >
                    {t("recommendation.preview.viewAll")}
                  </Button>
            </div>
          </div>
        );
      }}
    </OfferPreviewFrame>
  );
}