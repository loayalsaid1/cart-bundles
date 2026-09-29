"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { OfferInfo } from "@/lib/schemas/common-offer";
import {
  riyadhToday,
  riyadhTomorrow,
  toRiyadhCalendarDate,
} from "@/lib/utils/riyadh-date";

interface InfoDraftShape {
  info: OfferInfo;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : toRiyadhCalendarDate(d);
}

export function GeneralInfoStep() {
  const t = useTranslations("Offers");
  const tCommon = useTranslations("Common");
  const form = useFormContext<InfoDraftShape>();
  const noExpiry = form.watch("info.expiryDate") === undefined;
  const startNow = form.watch("info.startNow") !== false;
  const frozen = form.watch("info.startFrozen") === true;
  const storedStart = form.watch("info.startDate");
  const startMin = riyadhTomorrow();
  const expiryMin = startNow
    ? riyadhToday()
    : (toDateInputValue(storedStart) || startMin);

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="info.internalName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("info.internalName")}</FormLabel>
            <FormControl>
              <Input {...field} placeholder={t("info.internalNamePlaceholder")} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="info.title.ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("info.title")} — {tCommon("ar")}</FormLabel>
              <FormControl>
                <Input {...field} dir="rtl" placeholder={t("info.titlePlaceholderAr")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="info.title.en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("info.title")} — {tCommon("en")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("info.titlePlaceholderEn")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="info.subtitle.ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("info.subtitle")} — {tCommon("ar")}</FormLabel>
              <FormControl>
                <Input {...field} dir="rtl" placeholder={t("info.subtitlePlaceholderAr")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="info.subtitle.en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("info.subtitle")} — {tCommon("en")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("info.subtitlePlaceholderEn")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">{t("info.startDate")}</Label>
          <Input
            id="startDate"
            type="date"
            disabled={startNow || frozen}
            min={startMin}
            value={toDateInputValue(form.watch("info.startDate"))}
            onChange={(e) =>
              form.setValue(
                "info.startDate",
                e.target.value ? e.target.value : undefined,
              )
            }
            className="w-52"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm cursor-pointer">
          <Checkbox
            checked={startNow}
            disabled={frozen}
            onCheckedChange={(checked) => {
              form.setValue("info.startNow", Boolean(checked));
              form.setValue(
                "info.startDate",
                checked ? undefined : riyadhTomorrow(),
              );
            }}
          />
          {t("info.startNow")}
        </label>
      </div>
      {frozen ? (
        <p className="text-xs text-muted-foreground">{t("info.startFrozen")}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry">{t("info.expiry")}</Label>
          <Input
            id="expiry"
            type="date"
            disabled={noExpiry}
            min={expiryMin}
            value={toDateInputValue(form.watch("info.expiryDate"))}
            onChange={(e) =>
              form.setValue(
                "info.expiryDate",
                e.target.value ? e.target.value : undefined,
              )
            }
            className="w-52"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm cursor-pointer">
          <Checkbox
            checked={noExpiry}
            onCheckedChange={(checked) =>
              form.setValue(
                "info.expiryDate",
                checked ? undefined : riyadhToday(),
              )
            }
          />
          {t("info.noExpiry")}
        </label>
      </div>
    </div>
  );
}
