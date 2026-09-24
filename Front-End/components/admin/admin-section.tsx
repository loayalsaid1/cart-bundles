"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** Shared shell: title + bordered body with loading/empty/data states. */
export function AdminSection({
  title,
  isPending,
  isEmpty,
  emptyLabel,
  skeletonRows,
  children,
}: {
  title: string;
  isPending: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  skeletonRows: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-lg border">
        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function severityVariant(
  severity?: string,
): "destructive" | "outline" | "secondary" {
  if (severity === "error" || severity === "critical") return "destructive";
  if (severity === "warn") return "outline";
  return "secondary";
}
