"use client";

import * as React from "react";
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
            setError("Please enter a valid discount value greater than 0.");
            return;
        }
        if (discountType === "percentage" && numVal > 100) {
            setError("Percentage discount cannot exceed 100%.");
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
            setError(err.message || "Failed to apply discount.");
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
                                ? `Set Sale Price — ${products.length} Products`
                                : `Set Sale Price — "${products[0]?.name ?? "Product"}"`}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {isBulk
                                ? "Apply a bulk sale price across all selected products."
                                : "Set a sale price discount for this product."}
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
                            <Label>Discount Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={discountType === "percentage" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setDiscountType("percentage")}
                                    className="w-full text-xs"
                                >
                                    Percentage (%)
                                </Button>
                                <Button
                                    type="button"
                                    variant={discountType === "fixed" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setDiscountType("fixed")}
                                    className="w-full text-xs"
                                >
                                    Fixed Amount (SAR)
                                </Button>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1.5">
                            <Label htmlFor="discount-val">
                                {discountType === "percentage" ? "Discount %" : "Amount off (SAR)"}
                            </Label>
                            <Input
                                id="discount-val"
                                type="number"
                                step="any"
                                min="0.01"
                                max={discountType === "percentage" ? "100" : undefined}
                                placeholder={discountType === "percentage" ? "e.g. 15" : "e.g. 50"}
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
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={loading}>
                            {loading ? "Applying…" : "Apply Sale Price"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
