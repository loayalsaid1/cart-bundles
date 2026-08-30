"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OfferPreviewFrame } from "@/components/offers/builder/preview/offer-preview-frame";
import type { AddonOfferDraft } from "@/lib/schemas/addon-offer";

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

  const discounted = (price: number) =>
    discountType === "percentage"
      ? price * (1 - discountAmount / 100)
      : discountType === "fixed"
        ? Math.max(0, price - discountAmount)
        : price;

  const style = {
    borderRadius: `${radius}px`,
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
  } as React.CSSProperties;

  const visibleItems = items.slice(0, Math.max(1, maxItems));

  return (
    <OfferPreviewFrame>
      {({ lang }) => {
        const title = draft.info.title[lang] || draft.info.title.ar || "";
        const subtitle =
          draft.info.subtitle?.[lang] || draft.info.subtitle?.ar || "";
        return (
          <div className="space-y-4">
            <div className="mb-3 rounded-lg bg-muted">
              <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                {t("preview.productImage")}
              </div>
            </div>
            <p className="text-sm font-medium">{t("preview.productName")}</p>
            <p className="text-lg font-bold">
              {formatter.number(unitPrice, { style: "currency", currency: "SAR" })}
            </p>

            {visibleItems.length > 0 && (
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
                  <div
                    className={
                      orientation === "horizontal"
                        ? "mt-3 flex gap-2 overflow-x-auto"
                        : "mt-3 space-y-2"
                    }
                  >
                    {visibleItems.map((item, i) => {
                      const price = discounted(unitPrice * 0.6 + i * 10);
                      return (
                        <div
                          key={item.sallaProductId}
                          className={
                            orientation === "horizontal"
                              ? "w-24 shrink-0"
                              : "w-full"
                          }
                          style={{
                            borderRadius: `${Math.max(0, radius - 4)}px`,
                            border: `1px solid ${colors.cardBorder || "#e2e8f0"}`,
                          }}
                        >
                          <div className="flex h-16 items-center justify-center bg-muted text-[10px] text-muted-foreground">
                            {t("preview.productImage")}
                          </div>
                          <div className="p-2 text-center">
                            <p className="truncate text-[10px] font-medium">
                              {t("addon.preview.addonName", { index: i + 1 })}
                            </p>
                            <p className="text-[10px]" style={{ color: colors.savings }}>
                              {formatter.number(price, {
                                style: "currency",
                                currency: "SAR",
                              })}
                            </p>
                            <Button size="sm" className="mt-1 w-full text-[10px]">
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
