"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui/empty-state";
import { areaHex } from "@/lib/areas";
import type { DailyMinutesChartData } from "@/lib/queries";

type DailyMinutesChartProps = {
  data: DailyMinutesChartData;
};

export function DailyMinutesChart({ data }: DailyMinutesChartProps) {
  const hasSignal = data.points.some((point) => point.totalHours > 0);
  if (data.points.length === 0 || !hasSignal) {
    return (
      <EmptyState className="border-0 py-8">
        No time logged in this range
      </EmptyState>
    );
  }

  const dense = data.points.length > 14;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart
          data={data.points}
          margin={{ top: 8, right: 8, left: 0, bottom: dense ? 24 : 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval={dense ? "preserveStartEnd" : 0}
            angle={dense ? -35 : 0}
            textAnchor={dense ? "end" : "middle"}
            height={dense ? 50 : 30}
          />
          <YAxis
            unit="h"
            tick={{ fontSize: 12 }}
            width={36}
            allowDecimals
          />
          <Tooltip
            formatter={(value) =>
              typeof value === "number" ? `${value}h` : String(value ?? "")
            }
          />
          <Legend />
          {data.series.map((area, index) => (
            <Bar
              key={area.slug}
              dataKey={area.slug}
              name={area.name}
              stackId="day"
              fill={areaHex(area.color)}
              radius={
                index === data.series.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
