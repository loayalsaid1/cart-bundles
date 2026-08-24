"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";

function CallbackInner() {
  const t = useTranslations("Login");
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const errorParam = params.get("error");

    if (errorParam) {
      setError(t("errorDenied"));
      return;
    }
    if (!code || !state) {
      setError(t("errorMissingParams"));
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/v1/salla/oauth/token", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || t("errorFailed"));
          return;
        }

        router.replace("/products");
      } catch {
        setError(t("errorFailed"));
      }
    })();
  }, [params, router, t]);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-xl font-bold">{t("errorTitle")}</h1>
            <p className="text-sm text-red-500">{error}</p>
            <a
              href="/login"
              className="text-sm text-primary underline underline-offset-4"
            >
              {t("backToLogin")}
            </a>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">{t("loggingIn")}</h1>
          </>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-6">
          Loading...
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
