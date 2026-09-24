"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { useAdminSuggestions, useUpdateAdminSuggestion } from "@/hooks/use-admin";
import type { SuggestionStatus } from "@/lib/schemas/suggestions";
import { AdminSection } from "./admin-section";

const STATUSES: SuggestionStatus[] = [
  "new",
  "reviewed",
  "planned",
  "done",
  "rejected",
];

export function AdminSuggestionsTable() {
  const t = useTranslations("Admin");
  const suggestions = useAdminSuggestions();
  const updateSuggestion = useUpdateAdminSuggestion();
  const [notes, setNotes] = useState<Record<number, string>>({});

  return (
    <AdminSection
      title={t("suggestions.title")}
      isPending={suggestions.isPending}
      isEmpty={
        suggestions.isError ||
        !suggestions.data ||
        suggestions.data.length === 0
      }
      emptyLabel={t("suggestions.empty")}
      skeletonRows={4}
    >
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
          {(suggestions.data ?? []).map((row) => (
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
                      setNotes((prev) => ({
                        ...prev,
                        [row.id]: e.target.value,
                      }))
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
                        adminNote:
                          notes[row.id] ?? row.adminNote ?? undefined,
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
    </AdminSection>
  );
}
