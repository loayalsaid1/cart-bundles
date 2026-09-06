"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { PackageAdd01Icon } from "@hugeicons/core-free-icons";
import { ProductPickerDialog } from "@/components/offers/shared/product-picker-dialog";
import { useProductSearch } from "@/hooks/use-product-search";
import type { Product } from "@/types/product";

export function SingleProductField({
  value,
  onChange,
  pickLabel,
  changeLabel,
}: {
  value: number | undefined;
  onChange: (id: number) => void;
  pickLabel: string;
  changeLabel: string;
}) {
  const t = useTranslations("Offers");
  const [open, setOpen] = useState(false);
  const { data: allProducts = [] } = useProductSearch("", true);

  const product = useMemo(
    () => (value ? allProducts.find((p) => p.id === value) : undefined),
    [allProducts, value],
  );

  const apply = (picked: Product[]) => {
    const p = picked[0];
    if (!p) return;
    onChange(p.id);
  };

  return (
    <div className="space-y-3">
      {product ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-3">
            {product.thumbnail ? (
              <img
                src={product.thumbnail}
                alt={product.name}
                className="size-10 rounded-md object-cover"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                {t("pickers.products.noImage")}
              </div>
            )}
            <div className="flex-1 text-sm">
              <p className="font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {product.price?.amount} {product.price?.currency}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              {changeLabel}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <HugeiconsIcon icon={PackageAdd01Icon} size={16} />
          {pickLabel}
        </Button>
      )}

      {!product && value !== undefined && value > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("related.singleHint", { id: String(value) })}
        </p>
      )}

      <ProductPickerDialog
        key={open ? "product-picker-open" : "product-picker-closed"}
        open={open}
        onOpenChange={setOpen}
        selectedIds={value !== undefined ? [value] : []}
        initialProducts={product ? [product] : []}
        onApply={apply}
        single
      />
    </div>
  );
}
