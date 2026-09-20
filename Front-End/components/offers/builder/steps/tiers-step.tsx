"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { TierEditor } from "@/components/offers/builder/fields/tier-editor";
import { BehaviorSettings } from "@/components/offers/builder/fields/behavior-settings";
import type { QuantityOfferDraft } from "@/lib/schemas/quantity-offer";

const EMPTY_TIER = {
  quantity: 2,
  mainTitle: { ar: "", en: "" },
  subtitle: { ar: "", en: "" },
  pricingType: "percentage" as const,
  discountAmount: 10,
  isSelectedByDefault: false,
  badgeText: { ar: "", en: "" },
  labelText: "",
};

export function TiersStep() {
  const t = useTranslations("Offers");
  const { control, setValue } = useFormContext<QuantityOfferDraft>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "settings.tiers",
  });

  const markDefault = (index: number, isChecked: boolean) => {
    fields.forEach((_, i) => {
      setValue(`settings.tiers.${i}.isSelectedByDefault`, isChecked ? i === index : false);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("quantity.tiers.title")}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              ...EMPTY_TIER,
              mainTitle: { ar: "", en: "" },
              subtitle: { ar: "", en: "" },
            })
          }
        >
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          {t("quantity.tiers.addTier")}
        </Button>
      </div>

      <div className="max-h-[30rem] overflow-y-auto rounded-lg border p-4 space-y-4">
        {fields.map((field, index) => (
          <TierEditor
            key={field.id}
            index={index}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() => remove(index)}
            canMoveUp={index > 0}
            canMoveDown={index < fields.length - 1}
            onDefaultChange={(checked) => markDefault(index, checked)}
          />
        ))}
      </div>

      <BehaviorSettings />
    </div>
  );
}