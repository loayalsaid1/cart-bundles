"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OfferPreviewFrame } from "@/components/offers/builder/preview/offer-preview-frame";
import type { BundleOfferDraft } from "@/lib/schemas/bundle-offer";
import { previewCardStyle, resolvePreviewColors } from "@/lib/utils/preview-appearance";
import { useProductSearch } from "@/hooks/use-product-search";

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
  const colors = resolvePreviewColors(draft.appearance?.colors);
  const items = draft.settings.relatedProducts;
  const discountType = draft.settings.discountType;
  const discountAmount = draft.settings.discountAmount ?? 0;
  const cardStyle = previewCardStyle(draft.appearance?.colors, radius);

  const { data: allProducts = [] } = useProductSearch("", true);
  const targetId = draft.targeting?.ids?.[0];
  const targetProduct = allProducts.find((p) => p.id === targetId);
  const mainName = targetProduct?.name || t("preview.productName");
  const mainPrice = targetProduct?.price?.amount ?? unitPrice;
  const mainThumb = targetProduct?.thumbnail;

  const related = items.map((item, i) => {
    const matched = allProducts.find((p) => p.id === item.sallaProductId);
    const price = matched?.price?.amount ?? unitPrice * 0.6 + i * 12;
    const discounted =
      !discountType
        ? price
        : discountType === "free-product"
          ? 0
          : Math.max(0, price * (1 - discountAmount / 100));
    return {
      name: matched?.name || t("bundle.preview.itemName", { index: String(i + 1) }),
      thumb: matched?.thumbnail,
      price,
      discounted,
    };
  });

  const relatedRaw = related.reduce((acc, r) => acc + r.price, 0);
  const relatedFinal = related.reduce((acc, r) => acc + r.discounted, 0);
  const rawTotal = mainPrice + relatedRaw;
  const total = mainPrice + relatedFinal;
  const savings = Math.max(0, rawTotal - total);

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
              <p className="mt-0.5 text-[13px]" style={{ color: colors.mutedText }}>
                {subtitle}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div
                className="min-w-[110px] flex-1 max-w-[160px] p-2.5 text-center"
                style={{
                  border: `1.5px solid ${colors.badgeBg}`,
                  borderRadius: radius,
                  background: "#f8fafc",
                }}
              >
                <div className="relative mb-2 aspect-square overflow-hidden bg-muted" style={{ borderRadius: radius }}>
                  <span
                    className="absolute start-1 top-1 z-2 rounded px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: colors.badgeBg, color: colors.badgeText }}
                  >
                    {lang === "ar" ? "الأساسي" : "Main"}
                  </span>
                  {mainThumb ? (
                    <img src={mainThumb} alt={mainName} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <p className="mb-1 line-clamp-2 h-[2.4em] text-[13px] font-semibold" style={{ color: colors.bodyText }}>
                  {mainName}
                </p>
                <p className="text-[13px] font-bold" style={{ color: colors.bodyText }}>
                  {money(mainPrice)}
                </p>
              </div>
              {related.map((item, i) => (
                <div key={i} className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="text-lg font-bold text-slate-400">+</span>
                  <div
                    className="min-w-[110px] flex-1 max-w-[160px] p-2.5 text-center"
                    style={{
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: radius,
                      background: "#ffffff",
                    }}
                  >
                    <div className="mb-2 aspect-square overflow-hidden bg-muted" style={{ borderRadius: radius }}>
                      {item.thumb ? (
                        <img src={item.thumb} alt={item.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <p className="mb-1 line-clamp-2 h-[2.4em] text-[13px] font-semibold" style={{ color: colors.bodyText }}>
                      {item.name}
                    </p>
                    <p className="text-[13px] font-bold" style={{ color: colors.bodyText }}>
                      {money(item.discounted)}
                    </p>
                    {item.discounted < item.price && (
                      <p className="text-[11px] line-through text-slate-400">{money(item.price)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5"
              style={{
                borderRadius: radius,
                background: colors.selectedTier,
                border: `1px dashed ${colors.cardBorder}`,
              }}
            >
              <div>
                <p className="text-[12px]" style={{ color: colors.mutedText }}>
                  {t("bundle.preview.bundleTotal")}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold" style={{ color: colors.bodyText }}>
                    {money(total)}
                  </span>
                  {savings > 0 && (
                    <span className="text-[13px] line-through text-slate-400">{money(rawTotal)}</span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                className="font-bold"
                style={{ background: colors.badgeBg, color: colors.badgeText, borderRadius: radius }}
              >
                {t("bundle.preview.addBundle")}
              </Button>
            </div>
            {savings > 0 && (
              <p className="mt-1 text-end text-[12px] font-bold" style={{ color: colors.savings }}>
                {t("preview.save", { amount: formatter.number(savings) })}
              </p>
            )}
          </div>
        );
      }}
    </OfferPreviewFrame>
  );
}
