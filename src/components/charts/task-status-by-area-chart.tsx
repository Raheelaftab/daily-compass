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
import type {
  DashboardTaskBucket,
  TaskStatusByAreaRow,
} from "@/lib/queries";

type TaskStatusByAreaChartProps = {
  data: TaskStatusByAreaRow[];
  onSegmentClick: (areaId: number, bucket: DashboardTaskBucket) => void;
};

export function TaskStatusByAreaChart({
  data,
  onSegmentClick,
}: TaskStatusByAreaChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState className="border-0 py-8">No tasks to chart</EmptyState>
    );
  }

  const height = Math.max(220, data.length * 48);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklch, var(--muted) 60%, transparent)" }}
          />
          <Legend />
          <Bar
            dataKey="completed"
            name="Completed"
            stackId="status"
            fill="var(--chart-2)"
            className="cursor-pointer"
            onClick={(item) => {
              const payload = (
                item as { payload?: TaskStatusByAreaRow }
              ).payload;
              if (payload) onSegmentClick(payload.areaId, "completed");
            }}
          />
          <Bar
            dataKey="open"
            name="Open"
            stackId="status"
            fill="var(--chart-3)"
            className="cursor-pointer"
            onClick={(item) => {
              const payload = (
                item as { payload?: TaskStatusByAreaRow }
              ).payload;
              if (payload) onSegmentClick(payload.areaId, "open");
            }}
          />
          <Bar
            dataKey="overdue"
            name="Overdue"
            stackId="status"
            fill="var(--destructive)"
            className="cursor-pointer"
            radius={[0, 4, 4, 0]}
            onClick={(item) => {
              const payload = (
                item as { payload?: TaskStatusByAreaRow }
              ).payload;
              if (payload) onSegmentClick(payload.areaId, "overdue");
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
