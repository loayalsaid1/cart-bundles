"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SingleProductField } from "@/components/offers/builder/fields/single-product-field";
import type { UpgradeOfferDraft } from "@/lib/schemas/upgrade-offer";

interface UpgradeSettingsShape {
  settings: UpgradeOfferDraft["settings"];
  targeting: UpgradeOfferDraft["targeting"];
}

export function UpgradeSettingsStep() {
  const t = useTranslations("Offers");
  const form = useFormContext<UpgradeSettingsShape>();
  const settings = form.watch("settings");

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("upgrade.settings.productsTitle")}</h3>
        <div className="space-y-2">
          <Label>{t("upgrade.settings.baseProduct")}</Label>
          <SingleProductField
            value={settings.baseSallaProductId || undefined}
            onChange={(id) => {
              form.setValue("settings.baseSallaProductId", id);
              // Auto-sync targeting so base product is targeted on storefront
              form.setValue("targeting", {
                type: "selected_products",
                ids: id ? [id] : [],
              });
            }}
            pickLabel={t("upgrade.settings.pickBase")}
            changeLabel={t("upgrade.settings.change")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("upgrade.settings.upgradeProduct")}</Label>
          <SingleProductField
            value={settings.upgradeSallaProductId || undefined}
            onChange={(id) => form.setValue("settings.upgradeSallaProductId", id)}
            pickLabel={t("upgrade.settings.pickUpgrade")}
            changeLabel={t("upgrade.settings.change")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("upgrade.settings.couponCode")}</Label>
        <Input
          value={settings.couponCode ?? ""}
          onChange={(e) => form.setValue("settings.couponCode", e.target.value)}
          placeholder={t("upgrade.settings.couponPlaceholder")}
          className="max-w-xs"
        />
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t("upgrade.settings.behavior")}</h3>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm">{t("upgrade.settings.redirectToCartAfterAdd")}</span>
          <Switch
            checked={settings.redirectToCartAfterAdd ?? false}
            onCheckedChange={(checked) =>
              form.setValue("settings.redirectToCartAfterAdd", checked)
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm">{t("upgrade.settings.hideSallaPopup")}</span>
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
