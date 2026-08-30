"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PackageAdd01Icon } from "@hugeicons/core-free-icons";
import { ProductPickerDialog } from "@/components/offers/shared/product-picker-dialog";
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
  emptyKey?: string;
}) {
  const t = useTranslations("Offers");
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const apply = (picked: Product[]) => {
    setProducts(picked);
    onChange(
      picked.map((p, idx) => ({
        sallaProductId: p.id,
        position: idx,
        isPreselected: false,
      })),
    );
  };

  const remove = (id: number) => {
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    onChange(
      next.map((p, idx) => ({
        sallaProductId: p.id,
        position: idx,
        isPreselected: value.find((v) => v.sallaProductId === p.id)?.isPreselected ?? false,
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
        open={open}
        onOpenChange={setOpen}
        selectedIds={value.map((v) => v.sallaProductId)}
        onApply={apply}
      />
    </div>
  );
}
