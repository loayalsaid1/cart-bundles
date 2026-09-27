import { cookies } from "next/headers";
import { redirect, type Locale } from "@/i18n/routing";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { isAdminSessionValid } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, cookieStore] = await Promise.all([params, cookies()]);
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  if (await isAdminSessionValid(cookieHeader)) {
    redirect({ href: "/admin", locale: locale as Locale });
  }

  return (
    <div className="relative min-h-dvh">
      <div className="absolute top-4 inset-e-4 z-50 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
      <AdminLoginForm />
    </div>
  );
}
