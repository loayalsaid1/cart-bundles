"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RelatedProductsField } from "@/components/offers/builder/fields/related-products-field";
import { SingleProductField } from "@/components/offers/builder/fields/single-product-field";
import type { RecommendationOfferDraft } from "@/lib/schemas/recommendation-offer";
import type { RelatedProductDraft } from "@/lib/schemas/common-offer";

interface RecommendationSettingsShape {
  settings: RecommendationOfferDraft["settings"];
}

export function RecommendationSettingsStep() {
  const t = useTranslations("Offers");
  const form = useFormContext<RecommendationSettingsShape>();
  const settings = form.watch("settings");

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("recommendation.settings.modeTitle")}</h3>
        <RadioGroup
          value={settings.mode}
          onValueChange={(v) =>
            form.setValue(
              "settings.mode",
              v === "general" ? "general" : "cart_related",
            )
          }
          className="space-y-2"
        >
          <label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 cursor-pointer">
            <RadioGroupItem value="general" />
            {t("recommendation.settings.modeGeneral")}
          </label>
          <label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 cursor-pointer">
            <RadioGroupItem value="cart_related" />
            {t("recommendation.settings.modeCartRelated")}
          </label>
        </RadioGroup>
      </div>

      {settings.mode === "cart_related" && (
        <div className="space-y-2">
          <Label>{t("recommendation.settings.triggerProduct")}</Label>
          <SingleProductField
            value={settings.triggerSallaProductId || undefined}
            onChange={(id) =>
              form.setValue("settings.triggerSallaProductId", id)
            }
            pickLabel={t("recommendation.settings.pickTrigger")}
            changeLabel={t("recommendation.settings.change")}
          />
        </div>
      )}

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("recommendation.settings.productsTitle")}</h3>
        <RelatedProductsField
          value={settings.relatedProducts}
          onChange={(related: RelatedProductDraft[]) =>
            form.setValue("settings.relatedProducts", related)
          }
          emptyKey="recommendation.settings.productsEmpty"
        />
      </div>
    </div>
  );
}
