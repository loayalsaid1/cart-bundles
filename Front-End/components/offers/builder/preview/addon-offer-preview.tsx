"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OfferPreviewFrame } from "@/components/offers/builder/preview/offer-preview-frame";
import type { AddonOfferDraft } from "@/lib/schemas/addon-offer";

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
  const colors = draft.appearance?.colors ?? {};
  const items = draft.settings.relatedProducts;
  const orientation = draft.settings.displayOrientation ?? "horizontal";
  const maxItems = draft.settings.maxItems ?? 8;
  const discountType = draft.settings.discountType;
  const discountAmount = draft.settings.discountAmount ?? 0;

  const { data: allProducts = [] } = useProductSearch("", true);
  const targetId = draft.targeting?.ids?.[0];
  const targetProduct = allProducts.find((p) => p.id === targetId);

  const displayImage = targetProduct?.thumbnail;
  const displayName = targetProduct?.name || t("preview.productName");
  const displayPrice = targetProduct?.price?.amount ?? unitPrice;

  const discounted = (price: number) =>
    discountType === "percentage"
      ? price * (1 - discountAmount / 100)
      : price;

  const visibleItems = items.slice(0, Math.max(1, maxItems));

  return (
    <OfferPreviewFrame>
      {({ lang }) => {
        const title = draft.info.title[lang] || draft.info.title.ar || "";
        const subtitle =
          draft.info.subtitle?.[lang] || draft.info.subtitle?.ar || "";
        return (
          <div className="space-y-4 text-foreground">
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
            
            {/* Added text-foreground for contrast in dark mode */}
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-lg font-bold text-foreground">
              {formatter.number(displayPrice, { style: "currency", currency: "SAR" })}
            </p>

            {visibleItems.length > 0 && (
              <div>
                <div
                  className="p-3 border border-border bg-card/30! text-card-foreground shadow-sm"
                  style={{
                    borderRadius: `${radius}px`,
                    // Only apply custom inline styles if they exist, otherwise fallback to Tailwind theme classes
                    ...(colors.cardBorder ? { borderColor: colors.cardBorder } : {}),
                    ...(colors.cardBg ? { backgroundColor: colors.cardBg } : {}),
                  }}
                >
                  {title && (
                    <p
                      className="text-sm font-semibold text-foreground!"
                      style={colors.selectedTier ? { color: colors.selectedTier } : undefined}
                    >
                      {title}
                    </p>
                  )}
                  {subtitle && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {subtitle}
                    </p>
                  )}
                  <div
                    className={
                      orientation === "horizontal"
                        ? "mt-3 flex gap-2 overflow-x-auto pb-2"
                        : "mt-3 space-y-2"
                    }
                  >
                    {visibleItems.map((item, i) => {
                      const matchedProduct = allProducts.find(
                        (p) => p.id === item.sallaProductId,
                      );
                      const itemPrice = matchedProduct?.price?.amount
                        ? discounted(matchedProduct.price.amount)
                        : discounted(unitPrice * 0.6 + i * 10);
                      const itemThumb = matchedProduct?.thumbnail;
                      const itemName =
                        matchedProduct?.name ||
                        t("addon.preview.addonName", { index: i + 1 });

                      return (
                        <div
                          key={item.sallaProductId}
                          className={`border border-border bg-background overflow-hidden ${
                            orientation === "horizontal"
                              ? "w-24 shrink-0"
                              : "w-full"
                          }`}
                          style={{
                            borderRadius: `${Math.max(0, radius - 4)}px`,
                            ...(colors.cardBorder ? { borderColor: colors.cardBorder } : {}),
                          }}
                        >
                          <div className="flex min-h-16 items-center justify-center overflow-hidden bg-muted text-[10px] text-muted-foreground">
                            {itemThumb ? (
                              <img
                                src={itemThumb}
                                alt={itemName}
                                className="aspect-3/4 w-full object-cover"
                              />
                            ) : (
                              t("preview.productImage")
                            )}
                          </div>
                          <div className="p-2 text-center">
                            {/* Added text-foreground */}
                            <p className="truncate text-[10px] font-medium text-foreground" title={itemName}>
                              {itemName}
                            </p>
                            <p 
                              className="text-[10px] font-semibold text-primary mt-0.5" 
                              style={colors.savings ? { color: colors.savings } : undefined}
                            >
                              {formatter.number(itemPrice, {
                                style: "currency",
                                currency: "SAR",
                              })}
                            </p>
                            <Button size="sm" className="mt-2 w-full h-7 text-[10px]">
                              {t("addon.preview.add")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </OfferPreviewFrame>
  );
}