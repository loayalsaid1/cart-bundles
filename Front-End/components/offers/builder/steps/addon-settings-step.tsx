"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RelatedProductsField } from "@/components/offers/builder/fields/related-products-field";
import type { AddonOfferDraft } from "@/lib/schemas/addon-offer";
import type { RelatedProductDraft } from "@/lib/schemas/common-offer";

interface AddonSettingsShape {
  settings: AddonOfferDraft["settings"];
}

const POSITIONS = ["after_add_to_cart", "after_price", "before_add_to_cart"] as const;

export function AddonSettingsStep() {
  const t = useTranslations("Offers");
  const form = useFormContext<AddonSettingsShape>();
  const settings = form.watch("settings");

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("addon.settings.productsTitle")}</h3>
        <RelatedProductsField
          value={settings.relatedProducts}
          onChange={(related: RelatedProductDraft[]) =>
            form.setValue("settings.relatedProducts", related)
          }
          showPreselect
          emptyKey="addon.settings.productsEmpty"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("addon.settings.maxItems")}</Label>
          <Input
            type="number"
            min={1}
            value={settings.maxItems ?? 4}
            onChange={(e) =>
              form.setValue("settings.maxItems", Number(e.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>{t("addon.settings.orientation")}</Label>
          <RadioGroup
            value={settings.displayOrientation ?? "horizontal"}
            onValueChange={(v) =>
              form.setValue(
                "settings.displayOrientation",
                v as "vertical" | "horizontal",
              )
            }
            className="flex gap-4 pt-2"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="horizontal" />
              {t("addon.settings.orientationHorizontal")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="vertical" />
              {t("addon.settings.orientationVertical")}
            </label>
          </RadioGroup>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("addon.settings.discountTitle")}</h3>
        <div className="space-y-3">
          <RadioGroup
            value={settings.discountType ?? "none"}
            onValueChange={(v) =>
              form.setValue(
                "settings.discountType",
                v === "none" ? undefined : v === "free-product" ? "free-product" : "percentage",
              )
            }
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="percentage" />
              {t("addon.settings.percentage")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="free-product" />
              {t("addon.settings.freeProduct")}
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <RadioGroupItem value="none" />
              {t("addon.settings.noDiscount")}
            </label>
          </RadioGroup>
          {settings.discountType === "percentage" && (
            <div className="space-y-2">
              <Label>{t("addon.settings.discountAmount")}</Label>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("addon.settings.positionDesktop")}</Label>
          <Select
            value={settings.positionDesktop ?? "after_add_to_cart"}
            onValueChange={(v) => form.setValue("settings.positionDesktop", v ?? undefined)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`addon.settings.positions.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("addon.settings.positionMobile")}</Label>
          <Select
            value={settings.positionMobile ?? "after_add_to_cart"}
            onValueChange={(v) => form.setValue("settings.positionMobile", v ?? undefined)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`addon.settings.positions.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("addon.settings.behavior")}</h3>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm">{t("addon.settings.preselectedByDefault")}</span>
          <Switch
            checked={settings.productsPreselectedByDefault ?? false}
            onCheckedChange={(checked) => {
              form.setValue("settings.productsPreselectedByDefault", checked);
              form.setValue(
                "settings.relatedProducts",
                settings.relatedProducts.map((r) => ({
                  ...r,
                  isPreselected: checked,
                })),
              );
            }}
          />
        </label>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm">{t("addon.settings.showOptions")}</span>
          <Switch
            checked={settings.showProductOptions ?? false}
            onCheckedChange={(checked) =>
              form.setValue("settings.showProductOptions", checked)
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm">{t("addon.settings.redirectToCartAfterAdd")}</span>
          <Switch
            checked={settings.redirectToCartAfterAdd ?? false}
            onCheckedChange={(checked) =>
              form.setValue("settings.redirectToCartAfterAdd", checked)
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm">{t("addon.settings.hideSallaPopup")}</span>
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
