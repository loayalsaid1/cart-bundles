"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAdminLogin } from "@/hooks/use-admin";
import {
  adminLoginInputSchema,
  createAdminLoginInputSchema,
} from "@/lib/schemas/admin";
type AdminLoginInput = z.infer<typeof adminLoginInputSchema>;

export function AdminLoginForm() {
  const t = useTranslations("Admin");
  const login = useAdminLogin();
  const router = useRouter();
  const loginFormSchema = createAdminLoginInputSchema({
    emailRequired: t("login.emailRequired"),
    emailInvalid: t("login.emailInvalid"),
    passwordRequired: t("login.passwordRequired"),
  });
  const form = useForm<AdminLoginInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <Form {...form}>
        <form
          className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-sm"
          onSubmit={form.handleSubmit(async (values) => {
            form.clearErrors("root.server");
            try {
              await login.mutateAsync(values);
              router.replace("/admin");
              router.refresh();
            } catch {
              form.setError("root.server", { message: t("login.failed") });
            }
          })}
          noValidate
        >
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {t("login.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("login.email")}</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="username" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("login.password")}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="current-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root?.server && (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.root.server.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
