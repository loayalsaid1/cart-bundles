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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreateSuggestion, useSuggestions } from "@/hooks/use-suggestions";
import type { SuggestionStatus } from "@/lib/schemas/suggestions";

function statusVariant(status: SuggestionStatus) {
  if (status === "done") return "default" as const;
  if (status === "rejected") return "destructive" as const;
  if (status === "planned" || status === "reviewed") return "outline" as const;
  return "secondary" as const;
}

export function MerchantSuggestionsPage() {
  const t = useTranslations("Suggestions");
  const list = useSuggestions();
  const create = useCreateSuggestion();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const canSubmit = title.trim().length >= 3 && body.trim().length >= 10 && !create.isPending;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    create.mutate(
      { title: title.trim(), body: body.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="suggestion-title">{t("form.title")}</Label>
          <Input
            id="suggestion-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder={t("form.titlePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="suggestion-body">{t("form.body")}</Label>
          <Textarea
            id="suggestion-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            placeholder={t("form.bodyPlaceholder")}
            className="min-h-28"
          />
        </div>
        <Button type="submit" disabled={!canSubmit}>
          {create.isPending ? t("form.submitting") : t("form.submit")}
        </Button>
      </form>

      <div className="rounded-lg border">
        {list.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : list.isError ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{t("error")}</p>
        ) : !list.data || list.data.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.title")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.body}</p>
                    {row.adminNote ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("table.adminNote")}: {row.adminNote}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {t(`status.${row.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
