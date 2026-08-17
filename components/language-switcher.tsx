"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const nextLocale = locale === "ar" ? "en" : "ar";
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLocale}
      disabled={isPending}
      className="text-xs gap-1.5 font-medium"
    >
      <span className="text-base">{locale === "ar" ? "🇬🇧" : "🇸🇦"}</span>
      <span>{locale === "ar" ? "English" : "العربية"}</span>
    </Button>
  );
}
