"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import type { QuantityOfferDraft } from "@/lib/schemas/quantity-offer";

const BEHAVIOR_KEYS: Array<keyof QuantityOfferDraft["settings"]> = [
  "allowDifferentOptionsPerPiece",
  "hideThemeDefaultOptions",
  "showPricePerPiece",
  "roundPriceToNearestInteger",
  "applyEvenWithCoupon",
  "hideQuantityField",
  "redirectToCartAfterAdd",
];

export function BehaviorSettings() {
  const t = useTranslations("Offers");
  const form = useFormContext<QuantityOfferDraft>();
  const values = form.watch("settings");

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{t("quantity.settings.behavior")}</h3>
      {BEHAVIOR_KEYS.map((key) => (
        <label key={key} className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm">{t(`quantity.settings.${key}`)}</span>
          <Switch
            checked={(values[key] as boolean) ?? false}
            onCheckedChange={(checked) => form.setValue(`settings.${key}` as any, checked)}
          />
        </label>
      ))}
    </div>
  );
}
