"use client";

import * as React from "react";
import { useTranslations, useFormatter, useLocale, NumberFormatOptions } from "next-intl";
import { Product } from "@/types/product";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
    product: Product;
    selected?: boolean;
    onSelectChange?: (selected: boolean) => void;
    onSetSalePrice?: (product: Product) => void;
    onRemoveSalePrice?: (product: Product) => void;
}

export function ProductCard({
    product,
    selected = false,
    onSelectChange,
    onSetSalePrice,
    onRemoveSalePrice,
}: ProductCardProps) {
    const t = useTranslations("ProductCard");
    const format = useFormatter();
    const locale = useLocale();

    // Helper to format numbers: Eastern Arabic digits (٠١٢٣٤٥٦٧٨٩) for Arabic locale, Western digits (0123456789) for English
    const formatNumber = React.useCallback(
        (value: number | string, options?: NumberFormatOptions) => {
            const num = typeof value === "number" ? value : Number(value);
            if (isNaN(num)) return String(value);

            return format.number(num, 'arabicDigits', options as NumberFormatOptions);

        },
        [format, locale]
    );

    // Determine original price and sale price safely from Salla payload
    const rawRegularPrice = product.regular_price?.amount ?? product.price?.amount ?? 0;
    const rawSalePrice = product.sale_price?.amount ?? 0;
    const currency = product.price?.currency ?? "SAR";
    const displayCurrency = locale === "ar" && currency === "SAR" ? "ر.س" : currency;

    // Product has an active sale price if sale_price > 0 and lower than regular price, or marked by Salla
    const hasSalePrice =
        (rawSalePrice > 0 && rawSalePrice < rawRegularPrice) ||
        (product.has_special_price && rawSalePrice > 0);

    const originalPrice = hasSalePrice ? Math.max(rawRegularPrice, rawSalePrice) : rawRegularPrice;
    const currentPrice = hasSalePrice ? rawSalePrice : rawRegularPrice;
    const amountSaved = hasSalePrice ? originalPrice - currentPrice : 0;
    const percentOff =
        amountSaved > 0 && originalPrice > 0
            ? Math.round((amountSaved / originalPrice) * 100)
            : 0;

    return (
        <Card
            className={`relative overflow-hidden transition-all duration-200 hover:shadow-md border flex flex-col justify-between ${selected ? "ring-2 ring-primary border-primary bg-primary/5" : ""
                }`}
        >
            <div>
                {/* Top Controls Row */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                        {onSelectChange && (
                            <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => onSelectChange(Boolean(checked))}
                                title={t("selectProduct")}
                            />
                        )}
                        <span className="text-xs text-muted-foreground font-mono">
                            {t("idLabel", { id: formatNumber(product.id) })}
                        </span>
                    </div>

                    {hasSalePrice ? (
                        <Badge
                            variant="default"
                            className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold"
                        >
                            🏷️ {percentOff > 0 ? t("percentOff", { percent: formatNumber(percentOff) }) : t("onSale")}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            {t("standard")}
                        </Badge>
                    )}
                </div>

                {/* Thumbnail */}
                <div className="w-full h-40 bg-muted/30 flex items-center justify-center overflow-hidden">
                    {product.thumbnail ? (
                        <img
                            src={product.thumbnail}
                            alt={product.name}
                            className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="text-xs text-muted-foreground">{t("noImage")}</div>
                    )}
                </div>

                {/* Card Body */}
                <CardHeader className="p-4 pb-2">
                    <CardTitle
                        className="text-base font-semibold line-clamp-1"
                        title={product.name}
                    >
                        {product.name}
                    </CardTitle>
                    {product.sku && (
                        <CardDescription className="text-xs font-mono">
                            {t("skuLabel", { sku: product.sku })}
                        </CardDescription>
                    )}
                </CardHeader>

                <CardContent className="p-4 pt-0">
                    <div className="flex flex-col gap-1 mt-1">
                        {hasSalePrice ? (
                            <div className="space-y-1">
                                {/* Current Sale Price & Strikethrough Original Price side-by-side */}
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                        {formatNumber(currentPrice, { style: "currency", currency: "SAR" })}
                                    </span>
                                    <span className="text-sm font-medium text-muted-foreground line-through">
                                        {formatNumber(originalPrice, { style: "currency", currency: "SAR" })}
                                    </span>
                                </div>

                                {/* Savings indicator badge */}
                                {amountSaved > 0 && (
                                    <div>
                                        <span className="text-[10px] font-semibold text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-300 px-1.5 py-0.5 rounded">
                                            {t("saveAmount", {
                                                amount: formatNumber(amountSaved, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                }),
                                                currency: displayCurrency,
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Standard Price (No Sale) */
                            <span className="text-lg font-bold text-foreground mt-2">
                                {formatNumber(currentPrice)} {displayCurrency}
                            </span>
                        )}
                    </div>
                </CardContent>
            </div>

            {/* Footer Actions */}
            <div className="p-3 pt-0 mt-2 border-t border-border/40 flex gap-2">
                <Button
                    variant={hasSalePrice ? "outline" : "default"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => onSetSalePrice?.(product)}
                >
                    {hasSalePrice ? t("editSalePrice") : t("setSalePrice")}
                </Button>

                {hasSalePrice && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2.5"
                        onClick={() => onRemoveSalePrice?.(product)}
                        title={t("removeSalePrice")}
                    >
                        ✕
                    </Button>
                )}
            </div>
        </Card>
    );
}