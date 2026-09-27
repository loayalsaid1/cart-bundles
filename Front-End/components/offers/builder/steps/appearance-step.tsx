"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  AppearancePreset,
  AppearancePresetKind,
  AppearanceShadow,
  OfferAppearance,
  TitleAlign,
} from "@/lib/schemas/common-offer";
import { normalizeHex } from "@/lib/utils/preview-appearance";
import {
  useAppearancePresets,
  useCreateAppearancePreset,
  useDeleteAppearancePreset,
  useRenameAppearancePreset,
} from "@/hooks/use-appearance-presets";

interface AppearanceDraftShape {
  appearance?: OfferAppearance;
}

const BUILTIN_PRESETS = [
  {
    name: "minimal" as const,
    radius: 8,
    titleAlign: "start" as const,
    showBorder: true,
    shadow: "sm" as const,
    colors: {
      cardBg: "#ffffff",
      cardBorder: "#e2e8f0",
      selectedTier: "#f0fdf4",
      badgeBg: "#dcfce7",
      badgeText: "#166534",
      savings: "#16a34a",
    },
  },
  {
    name: "solid" as const,
    radius: 12,
    titleAlign: "start" as const,
    showBorder: true,
    shadow: "md" as const,
    colors: {
      cardBg: "#ffffff",
      cardBorder: "#e2e8f0",
      selectedTier: "#f0f9ff",
      badgeBg: "#004956",
      badgeText: "#ffffff",
      savings: "#004956",
    },
  },
  {
    name: "compact" as const,
    radius: 0,
    titleAlign: "start" as const,
    showBorder: true,
    shadow: "none" as const,
    colors: {
      cardBg: "#fafbfc",
      cardBorder: "#cbd5e1",
      selectedTier: "#f1f5f9",
      badgeBg: "#ef4444",
      badgeText: "#ffffff",
      savings: "#dc2626",
    },
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

const ALIGN_OPTIONS: TitleAlign[] = ["start", "center", "end"];
const SHADOW_OPTIONS: AppearanceShadow[] = ["none", "sm", "md", "lg"];

function ColorField({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  dir: "rtl" | "ltr";
}) {
  const display = value || "#ffffff";
  const [draft, setDraft] = useState(display);

  useEffect(() => {
    setDraft(display);
  }, [display]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizeHex(display) ?? "#ffffff"}
          onChange={(e) => {
            onChange(e.target.value);
            setDraft(e.target.value);
          }}
          className="h-9 w-10 cursor-pointer rounded-md border bg-card"
          aria-label={label}
        />
        <Input
          dir={dir}
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            const normalized = normalizeHex(next);
            if (normalized) onChange(normalized);
          }}
          onBlur={() => {
            const normalized = normalizeHex(draft);
            if (normalized) {
              setDraft(normalized);
              onChange(normalized);
            } else {
              setDraft(display);
            }
          }}
          className="font-mono"
          placeholder="#ffffff"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export function AppearanceStep() {
  const locale = useLocale();
  const t = useTranslations("Offers");
  const form = useFormContext<AppearanceDraftShape>();
  const radius = form.watch("appearance.borderRadiusPx") ?? 12;
  const colors = form.watch("appearance.colors") ?? {};
  const titleAlign = form.watch("appearance.titleAlign") ?? "start";
  const showBorder = form.watch("appearance.showBorder") ?? true;
  const shadow = form.watch("appearance.shadow") ?? "sm";

  const { data: savedPresets = [] } = useAppearancePresets();
  const createPreset = useCreateAppearancePreset();
  const deletePreset = useDeleteAppearancePreset();
  const renamePreset = useRenameAppearancePreset();

  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetKind, setPresetKind] = useState<AppearancePresetKind>("full");
  const [renamingPresetId, setRenamingPresetId] = useState<number | null>(null);
  const [renamingName, setRenamingName] = useState("");

  const applyBuiltin = (preset: (typeof BUILTIN_PRESETS)[number]) => {
    form.setValue("appearance.borderRadiusPx", preset.radius);
    form.setValue("appearance.colors", preset.colors);
    form.setValue("appearance.titleAlign", preset.titleAlign);
    form.setValue("appearance.showBorder", preset.showBorder);
    form.setValue("appearance.shadow", preset.shadow);
  };

  const applySaved = (preset: AppearancePreset) => {
    form.setValue("appearance.colors", preset.colors);
    if (preset.kind === "full") {
      form.setValue("appearance.borderRadiusPx", preset.borderRadiusPx ?? 12);
      form.setValue("appearance.titleAlign", preset.titleAlign ?? "start");
      form.setValue("appearance.showBorder", preset.showBorder ?? true);
      form.setValue("appearance.shadow", preset.shadow ?? "sm");
    }
  };

  const saveCurrent = () => {
    const name = presetName.trim();
    if (!name) return;
    createPreset.mutate(
      {
        name,
        kind: presetKind,
        colors,
        ...(presetKind === "full"
          ? { borderRadiusPx: radius, titleAlign, showBorder, shadow }
          : {}),
      },
      {
        onSuccess: () => {
          setSaveOpen(false);
          setPresetName("");
          setPresetKind("full");
        },
      },
    );
  };

  const renameSavedPreset = () => {
    const name = renamingName.trim();
    if (!renamingPresetId || !name) return;
    renamePreset.mutate(
      { id: renamingPresetId, name },
      { onSuccess: () => setRenamingPresetId(null) },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>{t("appearance.titleAlign")}</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALIGN_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={titleAlign === option ? "secondary" : "outline"}
              onClick={() => form.setValue("appearance.titleAlign", option)}
            >
              {t(`appearance.align.${option}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="show-border">{t("appearance.showBorder")}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("appearance.showBorderHint")}
          </p>
        </div>
        <Switch
          id="show-border"
          checked={showBorder}
          onCheckedChange={(checked) =>
            form.setValue("appearance.showBorder", Boolean(checked))
          }
        />
      </div>

      <div>
        <Label>{t("appearance.shadow")}</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {SHADOW_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={shadow === option ? "secondary" : "outline"}
              onClick={() => form.setValue("appearance.shadow", option)}
            >
              {t(`appearance.shadowLevels.${option}`)}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>{t("appearance.borderRadius")}</Label>
          <span className="text-xs text-muted-foreground">{radius}px</span>
        </div>
        <div dir="ltr">
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
      </div>

      <div className="space-y-2">
        <Label>{t("appearance.presetsLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {BUILTIN_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              type="button"
              onClick={() => applyBuiltin(preset)}
            >
              {t(`appearance.presets.${preset.name}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>{t("appearance.savedPresets")}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSaveOpen(true)}
          >
            {t("appearance.savePreset")}
          </Button>
        </div>
        {savedPresets.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("appearance.noSavedPresets")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {savedPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-1 rounded-md border pe-1"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applySaved(preset)}
                >
                  {preset.name}
                  <span className="ms-1 text-[10px] text-muted-foreground">
                    {t(`appearance.presetKind.${preset.kind}`)}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 px-0 text-muted-foreground"
                  onClick={() => deletePreset.mutate(preset.id)}
                  aria-label={t("appearance.deletePreset")}
                >
                  x
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1 text-muted-foreground"
                  onClick={() => {
                    setRenamingPresetId(preset.id);
                    setRenamingName(preset.name);
                  }}
                >
                  {t("appearance.renamePreset")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {COLOR_KEYS.map((key) => (
          <ColorField
            key={key}
            label={t(`appearance.colors.${key}`)}
            value={colors[key] ?? "#ffffff"}
            onChange={(hex) => form.setValue(`appearance.colors.${key}`, hex)}
            dir={locale === "ar" ? "rtl" : "ltr"}
          />
        ))}
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("appearance.savePresetTitle")}</DialogTitle>
            <DialogDescription>{t("appearance.savePresetHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">{t("appearance.presetName")}</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("appearance.presetKindLabel")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={presetKind === "full" ? "secondary" : "outline"}
                  onClick={() => setPresetKind("full")}
                >
                  {t("appearance.presetKind.full")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={presetKind === "colors" ? "secondary" : "outline"}
                  onClick={() => setPresetKind("colors")}
                >
                  {t("appearance.presetKind.colors")}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              {t("builder.cancel")}
            </Button>
            <Button
              type="button"
              onClick={saveCurrent}
              disabled={!presetName.trim() || createPreset.isPending}
            >
              {t("appearance.savePreset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renamingPresetId !== null}
        onOpenChange={(open) => !open && setRenamingPresetId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("appearance.renamePresetTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={renamingName}
            onChange={(e) => setRenamingName(e.target.value)}
            maxLength={80}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenamingPresetId(null)}>
              {t("builder.cancel")}
            </Button>
            <Button
              type="button"
              onClick={renameSavedPreset}
              disabled={!renamingName.trim() || renamePreset.isPending}
            >
              {t("appearance.renamePreset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
