"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const t = useTranslations("Login");

  const handleLogin = () => {
    window.location.href = "/api/v1/salla/oauth/authorize";
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full h-10 text-sm"
          onClick={handleLogin}
        >
          {t("signInWithSalla")}
        </Button>

        <p className="text-center text-xs text-muted-foreground/70">
          {t("hint")}
        </p>
      </div>
    </div>
  );
}
