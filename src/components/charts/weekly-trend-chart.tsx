"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui/empty-state";
import type { WeeklyTrendPoint } from "@/lib/queries";

type WeeklyTrendChartProps = {
  data: WeeklyTrendPoint[];
};

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  if (data.length === 0) {
    return <EmptyState className="border-0 py-8">No trend data yet</EmptyState>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            unit="h"
            tick={{ fontSize: 12 }}
            width={40}
            allowDecimals
          />
          <Tooltip
            formatter={(value) =>
              typeof value === "number" ? `${value}h` : String(value ?? "")
            }
            labelFormatter={(label) => `Week of ${label}`}
          />
          <Line
            type="monotone"
            dataKey="hours"
            name="Hours"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
