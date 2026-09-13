"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminActivity,
  useAdminLogin,
  useAdminLogout,
  useAdminOverview,
  useAdminSuggestions,
  useUpdateAdminSuggestion,
} from "@/hooks/use-admin";
import type { SuggestionStatus } from "@/lib/schemas/suggestions";

const STATUSES: SuggestionStatus[] = [
  "new",
  "reviewed",
  "planned",
  "done",
  "rejected",
];

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-card-foreground">{value}</p>
    </div>
  );
}

function LoginForm() {
  const t = useTranslations("Admin");
  const login = useAdminLogin();
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <form
        className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate(password);
        }}
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("login.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
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
        <Button type="submit" className="w-full" disabled={!password || login.isPending}>
          {login.isPending ? t("login.submitting") : t("login.submit")}
        </Button>
      </form>
    </div>
  );
}

export function AdminConsole() {
  const t = useTranslations("Admin");
  const overview = useAdminOverview();
  const activity = useAdminActivity();
  const suggestions = useAdminSuggestions();
  const updateSuggestion = useUpdateAdminSuggestion();
  const logout = useAdminLogout();
  const [notes, setNotes] = useState<Record<number, string>>({});

  if (overview.isError) {
    return <LoginForm />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {t("logout")}
        </Button>
      </div>

      {overview.isPending || !overview.data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Kpi label={t("kpis.merchants")} value={String(overview.data.merchants.total)} />
          <Kpi label={t("kpis.activeMerchants")} value={String(overview.data.merchants.active)} />
          <Kpi label={t("kpis.offers")} value={String(overview.data.offers.total)} />
          <Kpi label={t("kpis.webhooks")} value={String(overview.data.webhooksLast24h)} />
          <Kpi
            label={t("kpis.redis")}
            value={overview.data.redisConnected ? t("connected") : t("disconnected")}
          />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("errors.title")}</h2>
        <div className="rounded-lg border">
          {overview.isPending || !overview.data ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : overview.data.recentErrors.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("errors.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.time")}</TableHead>
                  <TableHead>{t("table.merchant")}</TableHead>
                  <TableHead>{t("table.action")}</TableHead>
                  <TableHead>{t("table.message")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.data.recentErrors.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{row.merchantId ?? "—"}</TableCell>
                    <TableCell className="font-medium">{row.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("activity.title")}</h2>
        <div className="rounded-lg border">
          {activity.isPending ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activity.isError || !activity.data || activity.data.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("activity.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.time")}</TableHead>
                  <TableHead>{t("table.merchant")}</TableHead>
                  <TableHead>{t("table.action")}</TableHead>
                  <TableHead>{t("table.severity")}</TableHead>
                  <TableHead>{t("table.message")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{row.merchantId ?? "—"}</TableCell>
                    <TableCell className="font-medium">{row.action}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.severity === "error"
                            ? "destructive"
                            : row.severity === "warn"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {row.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.message ?? row.entityType ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("suggestions.title")}</h2>
        <div className="rounded-lg border">
          {suggestions.isPending ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : suggestions.isError || !suggestions.data || suggestions.data.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {t("suggestions.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.merchant")}</TableHead>
                  <TableHead>{t("suggestions.column")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("suggestions.note")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.merchantId}</TableCell>
                    <TableCell>
                      <p className="font-medium">{row.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.body}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.status}
                        onValueChange={(status) =>
                          updateSuggestion.mutate({
                            id: row.id,
                            status: status as SuggestionStatus,
                            adminNote: notes[row.id] ?? row.adminNote ?? undefined,
                          })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {t(`suggestions.status.${status}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-56 items-center gap-2">
                        <Textarea
                          className="min-h-12"
                          value={notes[row.id] ?? row.adminNote ?? ""}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                          }
                          placeholder={t("suggestions.notePlaceholder")}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateSuggestion.isPending}
                          onClick={() =>
                            updateSuggestion.mutate({
                              id: row.id,
                              status: row.status,
                              adminNote: notes[row.id] ?? row.adminNote ?? undefined,
                            })
                          }
                        >
                          {t("suggestions.saveNote")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
