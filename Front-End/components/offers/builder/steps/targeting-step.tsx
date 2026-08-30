"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PackageAdd01Icon } from "@hugeicons/core-free-icons";
import { ProductPickerDialog } from "@/components/offers/shared/product-picker-dialog";
import { CategoryPickerDialog } from "@/components/offers/shared/category-picker-dialog";
import type { OfferTargeting } from "@/lib/schemas/common-offer";
import type { Product } from "@/types/product";
import type { Category } from "@/lib/api/categories";
import { useProductSearch } from "@/hooks/use-product-search";
import { useCategorySearch } from "@/hooks/use-category-search";

type TargetType = OfferTargeting["type"];

interface TargetingDraftShape {
  targeting: OfferTargeting;
}

export function TargetingStep({
  onProductsPicked,
}: {
  onProductsPicked: (products: Product[]) => void;
}) {
  const t = useTranslations("Offers");
  const form = useFormContext<TargetingDraftShape>();
  const { formState: { errors } } = form;
  const type = form.watch("targeting.type") as TargetType;
  const ids = form.watch("targeting.ids") ?? [];
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  // Fetch full lists using cached TanStack Query hooks
  const { data: allProducts = [] } = useProductSearch("", type === "selected_products");
  const { data: allCategories = [] } = useCategorySearch("", type === "selected_categories");

  // Derive target items directly from form IDs + query data (No duplicate local state)
  const products = useMemo(
    () => allProducts.filter((p) => ids.includes(p.id)),
    [allProducts, ids],
  );

  const categories = useMemo(
    () => allCategories.filter((c) => ids.includes(c.id)),
    [allCategories, ids],
  );

  const onProductsPickedRef = useRef(onProductsPicked);
  useEffect(() => {
    onProductsPickedRef.current = onProductsPicked;
  }, [onProductsPicked]);

  useEffect(() => {
    if (products.length > 0) {
      onProductsPickedRef.current(products);
    }
  }, [products]);

  const applyProducts = (picked: Product[]) => {
    form.setValue("targeting.ids", picked.map((p) => p.id));
  };

  const applyCategories = (picked: Category[]) => {
    form.setValue("targeting.ids", picked.map((c) => c.id));
  };

  const removeProduct = (id: number) => {
    form.setValue(
      "targeting.ids",
      ids.filter((selectedId) => selectedId !== id),
    );
  };

  const removeCategory = (id: number) => {
    form.setValue(
      "targeting.ids",
      ids.filter((selectedId) => selectedId !== id),
    );
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
              {t(`targeting.${option}`)}
            </label>
          ),
        )}
      </RadioGroup>

      {errors.targeting?.ids && (
        <p className="text-xs font-medium text-destructive mt-1">
          {errors.targeting.ids.message}
        </p>
      )}

      {type === "selected_products" && (
        <div className="space-y-3">
          <Button type="button" variant="outline" onClick={() => setProductPickerOpen(true)}>
            <HugeiconsIcon icon={PackageAdd01Icon} size={16} />
            {t("targeting.pickProducts")}
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
                      type="button"
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
          <Button type="button" variant="outline" onClick={() => setCategoryPickerOpen(true)}>
            <HugeiconsIcon icon={PackageAdd01Icon} size={16} />
            {t("targeting.pickCategories")}
          </Button>
          {categories.length > 0 && (
            <div className="space-y-2">
              {categories.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="flex-1 text-sm font-medium">{c.name}</span>
                    <Button
                      type="button"
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
        initialProducts={products}
        onApply={applyProducts}
      />
      <CategoryPickerDialog
        open={categoryPickerOpen}
        onOpenChange={setCategoryPickerOpen}
        selectedIds={ids}
        initialCategories={categories}
        onApply={applyCategories}
      />
    </div>
  );
}
