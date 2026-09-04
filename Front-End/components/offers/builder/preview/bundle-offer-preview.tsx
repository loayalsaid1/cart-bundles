"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OfferPreviewFrame } from "@/components/offers/builder/preview/offer-preview-frame";
import type { BundleOfferDraft } from "@/lib/schemas/bundle-offer";

export function BundleOfferPreview({
  draft,
  unitPrice,
}: {
  draft: BundleOfferDraft;
  unitPrice: number;
}) {
  const t = useTranslations("Offers");
  const formatter = useFormatter();
  const radius = draft.appearance?.borderRadiusPx ?? 12;
  const colors = draft.appearance?.colors ?? {};
  const items = draft.settings.relatedProducts;
  const discountType = draft.settings.discountType;
  const discountAmount = draft.settings.discountAmount ?? 0;

  const itemPrices = items.map((_, i) => unitPrice * 0.6 + i * 12);
  const discountedItemPrices = itemPrices.map((price) => {
    if (!discountType) return price;
    if (discountType === "free-product") return 0;
    return Math.max(0, price * (1 - discountAmount / 100));
  });
  const fullTotal = itemPrices.reduce((acc, p) => acc + p, 0);
  const total = discountedItemPrices.reduce((acc, p) => acc + p, 0);
  const savings = fullTotal - total;

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
          <div className="space-y-4">
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
                <div className="mt-3 space-y-2">
                  {itemPrices.length > 0 ? (
                    itemPrices.map((price, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md px-3 py-2 text-xs"
                        style={{
                          border: `1px solid ${colors.cardBorder || "#e2e8f0"}`,
                        }}
                      >
                        <span>
                          {t("bundle.preview.itemName", { index: i + 1 })}
                        </span>
                        <span>
                          {formatter.number(discountedItemPrices[i] ?? price, {
                            style: "currency",
                            currency: "SAR",
                          })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      {t("bundle.preview.noItems")}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-xs font-medium">
                    {t("bundle.preview.bundleTotal")}
                  </span>
                  <span className="text-sm font-bold" style={{ color: colors.savings }}>
                    {formatter.number(total, {
                      style: "currency",
                      currency: "SAR",
                    })}
                  </span>
                </div>
                {savings > 0 && (
                  <p className="mt-1 text-right text-[10px]" style={{ color: colors.savings }}>
                    {t("preview.save", {
                      amount: formatter.number(savings),
                    })}
                  </p>
                )}
                <Button className="mt-3 w-full" size="sm">
                  {t("bundle.preview.addBundle")}
                </Button>
              </div>
            </div>
          </div>
        );
      }}
    </OfferPreviewFrame>
  );
}
