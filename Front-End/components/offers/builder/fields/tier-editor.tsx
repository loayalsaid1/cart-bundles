"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import type { QuantityOfferDraft, QuantityTierDraft } from "@/lib/schemas/quantity-offer";

interface TierEditorProps {
  index: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDefaultChange: (checked: boolean) => void;
}

export function TierEditor({
  index,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
  onDefaultChange,
}: TierEditorProps) {
  const t = useTranslations("Offers");
  const tCommon = useTranslations("Common");
  const form = useFormContext<QuantityOfferDraft>();
  const tier = form.watch(`settings.tiers.${index}`) as QuantityTierDraft;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{t("quantity.tiers.tierLabel", { index: String(index + 1) })}</h4>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={!canMoveUp} aria-label={t("quantity.tiers.moveUp")}>
            <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={!canMoveDown} aria-label={t("quantity.tiers.moveDown")}>
            <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onRemove} aria-label={t("quantity.tiers.removeTier")}>
            <HugeiconsIcon icon={Delete01Icon} size={16} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("quantity.tiers.quantity")}</Label>
          <Input
            type="number"
            min={2}
            value={tier.quantity}
            onChange={(e) => form.setValue(`settings.tiers.${index}.quantity`, Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("quantity.tiers.badgeText")} — {tCommon("ar")}</Label>
          <Input
            dir="rtl"
            value={tier.badgeText?.ar ?? ""}
            onChange={(e) => form.setValue(`settings.tiers.${index}.badgeText.ar`, e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("quantity.tiers.badgeText")} — {tCommon("en")}</Label>
          <Input
            value={tier.badgeText?.en ?? ""}
            onChange={(e) => form.setValue(`settings.tiers.${index}.badgeText.en`, e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("quantity.tiers.mainTitle")} — {tCommon("ar")}</Label>
          <Input
            dir="rtl"
            value={tier.mainTitle.ar}
            onChange={(e) => form.setValue(`settings.tiers.${index}.mainTitle.ar`, e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("quantity.tiers.mainTitle")} — {tCommon("en")}</Label>
          <Input
            // dir="ltr"
            // className="text-left"
            value={tier.mainTitle.en ?? ""}
            onChange={(e) => form.setValue(`settings.tiers.${index}.mainTitle.en`, e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <RadioGroup
          value={tier.pricingType}
          onValueChange={(v) => form.setValue(`settings.tiers.${index}.pricingType`, v as "percentage" | "fixed")}
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="percentage" />
            {t("quantity.tiers.percentage")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="fixed" />
            {t("quantity.tiers.fixed")}
          </label>
        </RadioGroup>

        <div className="space-y-2">
          <Label>{t("quantity.tiers.discountValue")}</Label>
          <Input
            type="number"
            min={0}
            value={tier.discountAmount}
            onChange={(e) => form.setValue(`settings.tiers.${index}.discountAmount`, Number(e.target.value))}
            className="w-36"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm">{t("quantity.tiers.defaultSelected")}</span>
        <Switch checked={tier.isSelectedByDefault ?? false} onCheckedChange={(checked) => onDefaultChange(Boolean(checked))} />
      </div>
    </div>
  );
}
