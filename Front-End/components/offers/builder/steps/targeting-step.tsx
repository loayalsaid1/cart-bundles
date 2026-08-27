"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PackageAdd01Icon } from "@hugeicons/core-free-icons";
import { ProductPickerDialog } from "@/components/offers/shared/product-picker-dialog";
import { CategoryPickerDialog } from "@/components/offers/shared/category-picker-dialog";
import type { QuantityOfferDraft } from "@/lib/schemas/quantity-offer";
import type { Product } from "@/types/product";
import type { Category } from "@/lib/api/categories";

type TargetType = "all_products" | "selected_products" | "selected_categories";

export function TargetingStep({
  onProductsPicked,
}: {
  onProductsPicked: (products: Product[]) => void;
}) {
  const t = useTranslations("Offers");
  const form = useFormContext<QuantityOfferDraft>();
  const type = form.watch("targeting.type") as TargetType;
  const ids = form.watch("targeting.ids") ?? [];
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const applyProducts = (picked: Product[]) => {
    setProducts(picked);
    onProductsPicked(picked);
    form.setValue("targeting.ids", picked.map((p) => p.id));
  };

  const applyCategories = (picked: Category[]) => {
    setCategories(picked);
    form.setValue("targeting.ids", picked.map((c) => c.id));
  };

  const removeProduct = (id: number) => {
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    form.setValue("targeting.ids", next.map((p) => p.id));
  };

  const removeCategory = (id: number) => {
    const next = categories.filter((c) => c.id !== id);
    setCategories(next);
    form.setValue("targeting.ids", next.map((c) => c.id));
  };

  return (
    <div className="space-y-5">
      <RadioGroup
        value={type}
        onValueChange={(v) => form.setValue("targeting.type", v as TargetType)}
        className="space-y-2"
      >
        {(["all_products", "selected_products", "selected_categories"] as TargetType[]).map(
          (option) => (
            <label
              key={option}
              className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 cursor-pointer"
            >
              <RadioGroupItem value={option} />
              {t(`quantity.targeting.${option}` as any)}
            </label>
          ),
        )}
      </RadioGroup>

      {type === "selected_products" && (
        <div className="space-y-3">
          <Button variant="outline" onClick={() => setProductPickerOpen(true)}>
            <HugeiconsIcon icon={PackageAdd01Icon} size={16} />
            {t("quantity.targeting.pickProducts")}
          </Button>
          {products.length > 0 && (
            <div className="space-y-2">
              {products.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    {p.thumbnail && (
                      <img src={p.thumbnail} alt={p.name} className="size-10 rounded-md object-cover" />
                    )}
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.price?.amount} {p.price?.currency}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProduct(p.id)}
                      aria-label={t("pickers.remove")}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={16} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {type === "selected_categories" && (
        <div className="space-y-3">
          <Button variant="outline" onClick={() => setCategoryPickerOpen(true)}>
            <HugeiconsIcon icon={PackageAdd01Icon} size={16} />
            {t("quantity.targeting.pickCategories")}
          </Button>
          {categories.length > 0 && (
            <div className="space-y-2">
              {categories.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="flex-1 text-sm font-medium">{c.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCategory(c.id)}
                      aria-label={t("pickers.remove")}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={16} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <ProductPickerDialog
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        selectedIds={ids}
        onApply={applyProducts}
      />
      <CategoryPickerDialog
        open={categoryPickerOpen}
        onOpenChange={setCategoryPickerOpen}
        selectedIds={ids}
        onApply={applyCategories}
      />
    </div>
  );
}
