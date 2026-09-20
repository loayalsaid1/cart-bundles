"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminLogout, useAdminOverview } from "@/hooks/use-admin";
import { ApiError } from "@/lib/http";
import { AdminLoginForm } from "./admin-login-form";

const NAV_ITEMS = [
  { href: "/admin", key: "overview" as const, exact: true },
  { href: "/admin/merchants", key: "merchants" as const, exact: false },
  { href: "/admin/activity", key: "activity" as const, exact: false },
  { href: "/admin/suggestions", key: "suggestions" as const, exact: false },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Admin");
  const pathname = usePathname();
  const overview = useAdminOverview();
  const logout = useAdminLogout();

  if (
    overview.isError &&
    overview.error instanceof ApiError &&
    overview.error.status === 401
  ) {
    return <AdminLoginForm />;
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden w-56 shrink-0 border-e bg-card md:flex md:flex-col">
        <div className="border-b p-4">
          <p className="text-sm font-semibold">{t("title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label={t("title")}>
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            {t("logout")}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav
          className="flex gap-2 overflow-x-auto border-b p-3 md:hidden"
          aria-label={t("title")}
        >
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>
        <div className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
