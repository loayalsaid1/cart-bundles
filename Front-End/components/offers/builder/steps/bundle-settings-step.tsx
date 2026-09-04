"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RelatedProductsField } from "@/components/offers/builder/fields/related-products-field";
import type { BundleOfferDraft } from "@/lib/schemas/bundle-offer";
import type { RelatedProductDraft } from "@/lib/schemas/common-offer";

interface BundleSettingsShape {
  settings: BundleOfferDraft["settings"];
}

export function BundleSettingsStep() {
  const t = useTranslations("Offers");
  const form = useFormContext<BundleSettingsShape>();
  const settings = form.watch("settings");

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("bundle.settings.productsTitle")}</h3>
        <RelatedProductsField
          value={settings.relatedProducts}
          onChange={(related: RelatedProductDraft[]) =>
            form.setValue("settings.relatedProducts", related)
          }
          emptyKey="bundle.settings.productsEmpty"
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("bundle.settings.discountTitle")}</h3>
        <div className="space-y-3">
          <RadioGroup
            value={settings.discountType ?? "none"}
            onValueChange={(v) =>
              form.setValue(
                "settings.discountType",
                v === "none"
                  ? undefined
                  : v === "free-product"
                    ? "free-product"
                    : "percentage",
              )
            }
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="percentage" />
              {t("bundle.settings.percentage")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="free-product" />
              {t("bundle.settings.freeProduct")}
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <RadioGroupItem value="none" />
              {t("bundle.settings.noDiscount")}
            </label>
          </RadioGroup>
          {settings.discountType === "percentage" && (
            <div className="space-y-2">
              <Label>{t("bundle.settings.discountAmount")}</Label>
              <Input
                type="number"
                min={0}
                value={settings.discountAmount ?? ""}
                onChange={(e) =>
                  form.setValue("settings.discountAmount", Number(e.target.value))
                }
                className="w-36"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("bundle.settings.behavior")}</h3>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm">{t("bundle.settings.redirectToCartAfterAdd")}</span>
          <Switch
            checked={settings.redirectToCartAfterAdd ?? false}
            onCheckedChange={(checked) =>
              form.setValue("settings.redirectToCartAfterAdd", checked)
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm">{t("bundle.settings.hideSallaPopup")}</span>
          <Switch
            checked={settings.hideSallaPopup ?? true}
            onCheckedChange={(checked) =>
              form.setValue("settings.hideSallaPopup", checked)
            }
          />
        </label>
      </div>
    </div>
  );
}
