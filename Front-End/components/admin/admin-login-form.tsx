"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminLogin } from "@/hooks/use-admin";

export function AdminLoginForm() {
  const t = useTranslations("Admin") as any;
  const login = useAdminLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <form
        className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate({ email, password });
        }}
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("login.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-email">{t("login.email")}</Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">{t("login.password")}</Label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={!email || !password || login.isPending}
        >
          {login.isPending ? t("login.submitting") : t("login.submit")}
        </Button>
      </form>
    </div>
  );
}
