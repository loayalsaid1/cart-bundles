"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Product, ApplyPricingPayload } from "@/types/product";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DiscountModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    products: Product[];
    onApply: (payload: ApplyPricingPayload) => Promise<void>;
}

export function DiscountModal({
    open,
    onOpenChange,
    products,
    onApply,
}: DiscountModalProps) {
    const t = useTranslations("DiscountModal");
    const tCommon = useTranslations("Common");

    const [discountType, setDiscountType] = React.useState<"percentage" | "fixed">("percentage");
    const [value, setValue] = React.useState<string>("10");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Reset form each time the modal opens
    React.useEffect(() => {
        if (open) {
            setError(null);
            setValue("10");
            setDiscountType("percentage");
        }
    }, [open]);

    const numVal = parseFloat(value);
    const previewFormula =
        discountType === "percentage"
            ? `sale_price = price × (1 − ${isNaN(numVal) ? "?" : numVal}%)`
            : `sale_price = price − ${isNaN(numVal) ? "?" : numVal} SAR`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (isNaN(numVal) || numVal <= 0) {
            setError(t("errInvalidValue"));
            return;
        }
        if (discountType === "percentage" && numVal > 100) {
            setError(t("errMaxPercentage"));
            return;
        }

        setLoading(true);
        try {
            await onApply({
                productIds: products.map((p) => p.id),
                action: "set_sale",
                discountType,
                amount: numVal,
            });
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || t("errFailed"));
        } finally {
            setLoading(false);
        }
    };

    const isBulk = products.length > 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            {isBulk
                                ? t("titleBulk", { count: String(products.length) })
                                : t("titleSingle", { name: products[0]?.name ?? "Product" })}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {isBulk ? t("descBulk") : t("descSingle")}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="p-3 my-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4 py-3">
                        {/* Discount Type Toggle */}
                        <div className="space-y-1.5">
                            <Label>{t("discountType")}</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={discountType === "percentage" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setDiscountType("percentage")}
                                    className="w-full text-xs"
                                >
                                    {t("percentage")}
                                </Button>
                                <Button
                                    type="button"
                                    variant={discountType === "fixed" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setDiscountType("fixed")}
                                    className="w-full text-xs"
                                >
                                    {t("fixed")}
                                </Button>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1.5">
                            <Label htmlFor="discount-val">
                                {discountType === "percentage" ? t("amountLabelPercent") : t("amountLabelFixed")}
                            </Label>
                            <Input
                                id="discount-val"
                                type="number"
                                step="any"
                                min="0.01"
                                max={discountType === "percentage" ? "100" : undefined}
                                placeholder={discountType === "percentage" ? t("placeholderPercent") : t("placeholderFixed")}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>

                        {/* Live formula preview */}
                        <div className="rounded-md bg-muted/50 border px-3 py-2 text-[0.7rem] text-muted-foreground font-mono">
                            {previewFormula}
                        </div>
                    </div>

                    <DialogFooter className="mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            {tCommon("cancel")}
                        </Button>
                        <Button type="submit" size="sm" disabled={loading}>
                            {loading ? t("applying") : t("applySalePrice")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

