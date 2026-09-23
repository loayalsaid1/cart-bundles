"use client";

import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityLog } from "@/lib/schemas/activity";

const SEVERITY_COLORS: Record<string, string> = {
  info: "#3b82f6",
  warn: "#f59e0b",
  error: "#ef4444",
};

const ACTOR_COLORS: Record<string, string> = {
  merchant: "#10b981",
  admin: "#8b5cf6",
  system: "#6366f1",
  storefront: "#06b6d4",
  salla: "#ec4899",
};

export function AdminActivityCharts({ logs }: { logs: ActivityLog[] }) {
  const t = useTranslations("Admin.activity");

  // Calculate aggregations
  const severityCounts: Record<string, number> = {};
  const actorCounts: Record<string, number> = {};

  logs.forEach((log) => {
    const sev = log.severity || "info";
    severityCounts[sev] = (severityCounts[sev] || 0) + 1;

    const act = log.actorType || "system";
    actorCounts[act] = (actorCounts[act] || 0) + 1;
  });

  const severityPieData = Object.entries(severityCounts).map(([sev, count]) => ({
    name: t(`severities.${sev}` as any) || sev,
    value: count,
    color: SEVERITY_COLORS[sev] || "#94a3b8",
  }));

  const actorBarData = Object.entries(actorCounts).map(([act, count]) => ({
    name: t(`actors.${act}` as any) || act,
    count,
    fill: ACTOR_COLORS[act] || "#94a3b8",
  }));

  const totalLogs = logs.length;
  const errorCount = severityCounts["error"] || 0;
  const systemCount = actorCounts["system"] || 0;
  const merchantCount = actorCounts["merchant"] || 0;

  return (
    <div className="space-y-4">
      {/* KPI Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground">{t("stats.totalEvents")}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{totalLogs}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground">{t("stats.errorRate")}</p>
          <p className={`mt-1 text-2xl font-bold tracking-tight ${errorCount > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
            {errorCount}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground">{t("stats.systemEvents")}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{systemCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground">{t("stats.merchantActions")}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{merchantCount}</p>
        </Card>
      </div>

      {/* Visual Charts Row */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">
              {t("charts.severityDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full flex items-center justify-center">
              {severityPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {severityPieData.map((entry, index) => (
                        <Cell key={`sev-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground">{t("empty")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">
              {t("charts.actorBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full pt-2">
              {actorBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actorBarData}>
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="#888888"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="#888888"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {actorBarData.map((entry, index) => (
                        <Cell key={`act-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground">{t("empty")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
