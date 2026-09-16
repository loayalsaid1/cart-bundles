"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-card-foreground">{value}</p>
    </div>
  );
}

export function KpiGrid({
  items,
  columns = 5,
}: {
  items: Array<{ label: string; value: string }>;
  columns?: 4 | 5;
}) {
  return (
    <div
      className={
        columns === 4
          ? "grid grid-cols-2 gap-4 sm:grid-cols-4"
          : "grid grid-cols-2 gap-4 sm:grid-cols-5"
      }
    >
      {items.map((item) => (
        <Kpi key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

export function KpiSkeleton({
  count,
  columns = 5,
}: {
  count: number;
  columns?: 4 | 5;
}) {
  return (
    <div
      className={
        columns === 4
          ? "grid grid-cols-2 gap-4 sm:grid-cols-4"
          : "grid grid-cols-2 gap-4 sm:grid-cols-5"
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
