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

interface InfoDraftShape {
  info: OfferInfo;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function GeneralInfoStep() {
  const t = useTranslations("Offers");
  const form = useFormContext<InfoDraftShape>();
  const noExpiry = form.watch("info.expiryDate") === undefined;

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
              <FormLabel>{t("info.title")} — {t("common.ar")}</FormLabel>
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
              <FormLabel>{t("info.title")} — {t("common.en")}</FormLabel>
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
              <FormLabel>{t("info.subtitle")} — {t("common.ar")}</FormLabel>
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
              <FormLabel>{t("info.subtitle")} — {t("common.en")}</FormLabel>
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
          <Label htmlFor="expiry">{t("info.expiry")}</Label>
          <Input
            id="expiry"
            type="date"
            disabled={noExpiry}
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
              form.setValue("info.expiryDate", checked ? undefined : new Date().toISOString().slice(0, 10))
            }
          />
          {t("info.noExpiry")}
        </label>
      </div>
    </div>
  );
}
