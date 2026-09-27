import React from "react";
import { cookies } from "next/headers";
import { redirect, type Locale } from "@/i18n/routing";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminSessionValid } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, cookieStore] = await Promise.all([params, cookies()]);
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  if (!(await isAdminSessionValid(cookieHeader))) {
    redirect({ href: "/admin/login", locale: locale as Locale });
  }

  return <AdminShell>{children}</AdminShell>;
}
