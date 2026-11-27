"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui/empty-state";
import { areaHex } from "@/lib/areas";
import { minutesToHours } from "@/lib/dates";
import type { WeekAreaHours } from "@/lib/queries";

type HoursByAreaChartProps = {
  data: WeekAreaHours[];
  onLoggedBarClick?: (areaId: number) => void;
};

export function HoursByAreaChart({
  data,
  onLoggedBarClick,
}: HoursByAreaChartProps) {
  const chartData = data.map((row) => ({
    areaId: row.areaId,
    name: row.name,
    color: areaHex(row.color),
    logged: minutesToHours(row.loggedMinutes),
    target:
      row.targetMinutes != null ? minutesToHours(row.targetMinutes) : null,
  }));

  if (chartData.length === 0) {
    return <EmptyState className="border-0 py-8">No areas to chart</EmptyState>;
  }

  const height = Math.max(220, chartData.length * 44);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" unit="h" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) =>
              typeof value === "number" ? `${value}h` : String(value ?? "")
            }
          />
          <Legend />
          <Bar
            dataKey="logged"
            name="Logged"
            radius={[0, 4, 4, 0]}
            barSize={12}
            className={onLoggedBarClick ? "cursor-pointer" : undefined}
            onClick={(item) => {
              if (!onLoggedBarClick) return;
              const payload = (
                item as { payload?: { areaId?: number } }
              ).payload;
              if (typeof payload?.areaId === "number") {
                onLoggedBarClick(payload.areaId);
              }
            }}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
          <Bar
            dataKey="target"
            name="Target"
            fill="currentColor"
            className="text-muted-foreground/40"
            radius={[0, 4, 4, 0]}
            barSize={12}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
