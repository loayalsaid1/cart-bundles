"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OfferPreviewFrame } from "@/components/offers/builder/preview/offer-preview-frame";
import type { RecommendationOfferDraft } from "@/lib/schemas/recommendation-offer";

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
  const colors = draft.appearance?.colors ?? {};
  const items = draft.settings.relatedProducts;
  const mode = draft.settings.mode;

  const style = {
    borderRadius: `${radius}px`,
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  } as React.CSSProperties;

  return (
    <OfferPreviewFrame>
      {({ lang }) => {
        const title = draft.info.title[lang] || draft.info.title.ar || "";
        const subtitle =
          draft.info.subtitle?.[lang] || draft.info.subtitle?.ar || "";
        return (
          <div className="space-y-3">
            <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
              {t("preview.productImage")}
            </div>
            <p className="text-sm font-medium">{t("preview.productName")}</p>

            <div style={style}>
              <div
                className="p-3"
                style={{
                  border: `1px solid ${colors.cardBorder || "#e2e8f0"}`,
                  borderRadius: `${radius}px`,
                }}
              >
                {title && (
                  <p
                    className="text-sm font-semibold"
                    style={{ color: colors.selectedTier || undefined }}
                  >
                    {title}
                  </p>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {items.length > 0 ? (
                    items.map((item, i) => {
                      const price = unitPrice * 0.7 + i * 9;
                      return (
                        <div
                          key={item.sallaProductId}
                          style={{
                            borderRadius: `${Math.max(0, radius - 4)}px`,
                            border: `1px solid ${colors.cardBorder || "#e2e8f0"}`,
                          }}
                        >
                          <div className="flex h-14 items-center justify-center bg-muted text-[10px] text-muted-foreground">
                            {t("preview.productImage")}
                          </div>
                          <div className="p-2">
                            <p className="truncate text-[10px] font-medium">
                              {t("recommendation.preview.productName", {
                                index: i + 1,
                              })}
                            </p>
                            <p className="text-[10px]" style={{ color: colors.savings }}>
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
                    <p className="col-span-2 py-2 text-center text-xs text-muted-foreground">
                      {t("recommendation.preview.noProducts")}
                    </p>
                  )}
                </div>
                {mode === "cart_related" && (
                  <p className="mt-3 border-t pt-2 text-[10px] text-muted-foreground">
                    {t("recommendation.preview.cartHint")}
                  </p>
                )}
                <Button className="mt-3 w-full" size="sm">
                  {t("recommendation.preview.viewAll")}
                </Button>
              </div>
            </div>
          </div>
        );
      }}
    </OfferPreviewFrame>
  );
}
