"use client";

import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PerformancePoint {
  date: string;
  impressions: number;
  conversions: number;
}

interface AdminOverviewChartsProps {
  dailyPerformance: PerformancePoint[];
  kindBreakdown: Record<string, number>;
}

const KIND_COLORS: Record<string, string> = {
  quantity_discount: "#3b82f6",
  product_add_on: "#10b981",
  bundle: "#8b5cf6",
  upgrade_offer: "#f59e0b",
  cart_recommendation: "#ec4899",
};

export function AdminOverviewCharts({
  dailyPerformance,
  kindBreakdown,
}: AdminOverviewChartsProps) {
  const tAdmin = useTranslations("Admin");
  const tOffers = useTranslations("Offers.kind");

  const pieData = Object.entries(kindBreakdown)
    .filter(([_, value]) => value > 0)
    .map(([kind, value]) => ({
      name: tOffers(kind as any) || kind,
      value,
      color: KIND_COLORS[kind] || "#94a3b8",
    }));

  const hasActivityData = dailyPerformance && dailyPerformance.length > 0;

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 w-full">
      <Card className="lg:col-span-2 w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {tAdmin("charts.activityTrend")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full pt-2">
            {hasActivityData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyPerformance}>
                  <XAxis
                    dataKey="date"
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
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={tAdmin("charts.impressions")}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversions"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={tAdmin("charts.conversions")}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-muted-foreground">
                  {tAdmin("charts.emptyActivity")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {tAdmin("charts.offerTypes")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="42%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-muted-foreground">
                  {tAdmin("charts.emptyOffers")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
