"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { OfferAppearance } from "@/lib/schemas/common-offer";

interface AppearanceDraftShape {
  appearance?: OfferAppearance;
}

const PRESETS: Array<{ name: string; radius: number; colors: Record<string, string> }> = [
  {
    name: "minimal",
    radius: 8,
    colors: { cardBg: "#ffffff", cardBorder: "#e2e8f0", selectedTier: "#f0fdf4", badgeBg: "#dcfce7", badgeText: "#166534", savings: "#16a34a" },
  },
  {
    name: "solid",
    radius: 12,
    colors: { cardBg: "#ffffff", cardBorder: "#e2e8f0", selectedTier: "#f0f9ff", badgeBg: "#004956", badgeText: "#ffffff", savings: "#004956" },
  },
  {
    name: "compact",
    radius: 0,
    colors: { cardBg: "#fafbfc", cardBorder: "#cbd5e1", selectedTier: "#f1f5f9", badgeBg: "#ef4444", badgeText: "#ffffff", savings: "#dc2626" },
  },
];

const COLOR_KEYS = [
  "cardBg",
  "cardBorder",
  "selectedTier",
  "badgeBg",
  "badgeText",
  "savings",
] as const;

export function AppearanceStep() {
  const t = useTranslations("Offers");
  const form = useFormContext<AppearanceDraftShape>();
  const radius = form.watch("appearance.borderRadiusPx") ?? 12;
  const colors = form.watch("appearance.colors") ?? {};

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    form.setValue("appearance.borderRadiusPx", preset.radius);
    form.setValue("appearance.colors", preset.colors);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <Label>{t("appearance.borderRadius")}</Label>
          <span className="text-xs text-muted-foreground">{radius}px</span>
        </div>
        <Slider
          min={0}
          max={24}
          step={1}
          value={[radius]}
          onValueChange={(val) => {
            const v = Array.isArray(val) ? val[0] : Number(val);
            if (!Number.isNaN(v)) form.setValue("appearance.borderRadiusPx", v);
          }}
          className="mt-2"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("appearance.presetsLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
            >
              {t(`appearance.presets.${preset.name}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {COLOR_KEYS.map((key) => (
          <div key={key} className="space-y-2">
            <Label>{t(`appearance.colors.${key}`)}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colors[key] ?? "#ffffff"}
                onChange={(e) =>
                  form.setValue(`appearance.colors.${key}`, e.target.value)
                }
                className="h-8 w-12 cursor-pointer rounded-md border bg-card"
              />
              <code className="text-xs text-muted-foreground">{colors[key] ?? "#ffffff"}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
