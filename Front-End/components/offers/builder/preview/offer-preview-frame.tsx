"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SmartPhone01Icon,
  MonitorDotIcon,
  Globe02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

type Device = "mobile" | "desktop";
type PreviewLocale = "ar" | "en";

export function OfferPreviewFrame({
  children,
}: {
  children: (opts: { lang: PreviewLocale; device: Device }) => React.ReactNode;
}) {
  const t = useTranslations("Offers");
  const locale = useLocale() as PreviewLocale;
  const [device, setDevice] = useState<Device>("desktop");
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>(locale);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("preview.title")}</p>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
              size="icon"
              variant={device === "mobile" ? "secondary" : "ghost"}
              onClick={() => setDevice("mobile")}
              aria-label={t("preview.mobile")}
            >
              <HugeiconsIcon icon={SmartPhone01Icon} size={14} />
            </Button>
            <Button
              size="icon"
              variant={device === "desktop" ? "secondary" : "ghost"}
              onClick={() => setDevice("desktop")}
              aria-label={t("preview.desktop")}
            >
              <HugeiconsIcon icon={MonitorDotIcon} size={14} />
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setPreviewLocale(previewLocale === "ar" ? "en" : "ar")}
            aria-label={t("preview.locale")}
          >
            <HugeiconsIcon icon={Globe02Icon} size={14} />
          </Button>
        </div>
      </div>

      <div
        dir={previewLocale === "ar" ? "rtl" : "ltr"}
        className={cn(
          "rounded-xl border bg-background p-4 transition-all",
          device === "mobile" ? "mx-auto w-[300px]" : "w-full",
        )}
      >
        {children({ lang: previewLocale, device })}
      </div>
    </div>
  );
}
