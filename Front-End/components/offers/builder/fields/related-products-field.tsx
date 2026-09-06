"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PackageAdd01Icon } from "@hugeicons/core-free-icons";
import { ProductPickerDialog } from "@/components/offers/shared/product-picker-dialog";
import { useProductSearch } from "@/hooks/use-product-search";
import type { RelatedProductDraft } from "@/lib/schemas/common-offer";
import type { Product } from "@/types/product";

export function RelatedProductsField({
  value,
  onChange,
  showPreselect = false,
  emptyKey = "shared.empty",
}: {
  value: RelatedProductDraft[];
  onChange: (related: RelatedProductDraft[]) => void;
  showPreselect?: boolean;
  emptyKey?:
    | "shared.empty"
    | "addon.settings.productsEmpty"
    | "bundle.settings.productsEmpty"
    | "recommendation.settings.productsEmpty";
}) {
  const t = useTranslations("Offers");
  const [open, setOpen] = useState(false);
  const { data: allProducts = [] } = useProductSearch("", true);

  const sallaProductIds = useMemo(
    () => value.map((v) => v.sallaProductId),
    [value],
  );

  const products = useMemo(
    () => allProducts.filter((p) => sallaProductIds.includes(p.id)),
    [allProducts, sallaProductIds],
  );

  const apply = (picked: Product[]) => {
    onChange(
      picked.map((p, idx) => ({
        sallaProductId: p.id,
        position: idx,
        isPreselected:
          value.find((v) => v.sallaProductId === p.id)?.isPreselected ?? false,
      })),
    );
  };

  const remove = (id: number) => {
    const nextIds = sallaProductIds.filter((pId) => pId !== id);
    onChange(
      nextIds.map((pId, idx) => ({
        sallaProductId: pId,
        position: idx,
        isPreselected:
          value.find((v) => v.sallaProductId === pId)?.isPreselected ?? false,
      })),
    );
  };

  const togglePreselect = (id: number, checked: boolean) => {
    onChange(
      value.map((v) =>
        v.sallaProductId === id ? { ...v, isPreselected: checked } : v,
      ),
    );
  };

  return (
    <div className="space-y-3">
      <Button variant="outline" onClick={() => setOpen(true)}>
        <HugeiconsIcon icon={PackageAdd01Icon} size={16} />
        {t("related.addProducts")}
      </Button>

      {products.length === 0 && value.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("related.rePickHint")}
        </p>
      ) : products.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t(emptyKey)}</p>
      ) : null}

      <div className="space-y-2">
        {products.map((p) => {
          const related = value.find((v) => v.sallaProductId === p.id);
          return (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-3 p-3">
                {p.thumbnail ? (
                  <img
                    src={p.thumbnail}
                    alt={p.name}
                    className="size-10 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                    {t("pickers.products.noImage")}
                  </div>
                )}
                <div className="flex-1 text-sm">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.price?.amount} {p.price?.currency}
                  </p>
                </div>
                {showPreselect && (
                  <label className="flex items-center gap-2 text-xs">
                    {t("related.preselect")}
                    <Switch
                      checked={related?.isPreselected ?? false}
                      onCheckedChange={(checked) =>
                        togglePreselect(p.id, checked)
                      }
                    />
                  </label>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(p.id)}
                  aria-label={t("pickers.remove")}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ProductPickerDialog
        key={open ? "product-picker-open" : "product-picker-closed"}
        open={open}
        onOpenChange={setOpen}
        selectedIds={value.map((v) => v.sallaProductId)}
        initialProducts={products}
        onApply={apply}
      />
    </div>
  );
}
