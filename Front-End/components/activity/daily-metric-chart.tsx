"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailyStatPoint } from "@/lib/schemas/activity";

type MetricKey = "impressions" | "clicks" | "addToCart";

const METRIC_COLOR: Record<MetricKey, string> = {
  impressions: "var(--chart-1)",
  clicks: "var(--chart-5)",
  addToCart: "var(--chart-3)",
};

export function DailyMetricChart({
  metric,
  data,
  isPending,
  isError,
}: {
  metric: MetricKey;
  data: DailyStatPoint[] | undefined;
  isPending: boolean;
  isError: boolean;
}) {
  const t = useTranslations("Activity");
  const format = useFormatter();
  const config = {
    [metric]: {
      label: t(`kpis.${metric}`),
      color: METRIC_COLOR[metric],
    },
  } satisfies ChartConfig;

  const total = data?.reduce((sum, row) => sum + row[metric], 0) ?? 0;
  const hasHistory = total > 0;

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>{t(`charts.${metric}.title`)}</CardTitle>
        <CardDescription>{t("charts.window")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-[180px] w-full" />
        ) : isError ? (
          <p className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
            {t("charts.error")}
          </p>
        ) : (
          <>
            <ChartContainer
              config={config}
              className="aspect-auto h-[180px] w-full"
              aria-label={t(`charts.${metric}.title`)}
            >
              <AreaChart data={data ?? []} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tickFormatter={(value: string) =>
                    format.dateTime(new Date(`${value}T00:00:00Z`), {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })
                  }
                />
                <YAxis
                  width={36}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickFormatter={(value: number) => format.number(value)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        typeof value === "string"
                          ? format.dateTime(new Date(`${value}T00:00:00Z`), {
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            })
                          : String(value ?? "")
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={`var(--color-${metric})`}
                  fill={`var(--color-${metric})`}
                  fillOpacity={0.18}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
            {!hasHistory ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t(`charts.${metric}.empty`)}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
