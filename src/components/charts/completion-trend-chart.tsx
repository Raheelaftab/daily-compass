"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui/empty-state";
import type { CompletionTrendPoint } from "@/lib/queries";

type CompletionTrendChartProps = {
  data: CompletionTrendPoint[];
};

export function CompletionTrendChart({ data }: CompletionTrendChartProps) {
  const hasSignal = data.some((row) => row.completed > 0 || row.created > 0);
  if (data.length === 0 || !hasSignal) {
    return (
      <EmptyState className="border-0 py-8">
        No completions or creations in this range
      </EmptyState>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="created"
            name="Created"
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
