import type { McpServer } from "@modelcontextprotocol/server";

import {
  createTaskMcpSchema,
  getWeekSummarySchema,
  listAreasSchema,
  listTasksSchema,
  logTimeMcpSchema,
  setTop3Schema,
  updateTaskMcpSchema,
} from "./schemas";
import * as service from "./service";
import { McpToolError } from "./service";

function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

async function runTool<T>(fn: () => Promise<T>) {
  try {
    return jsonResult(await fn());
  } catch (error) {
    if (error instanceof McpToolError) {
      return errorResult(error.message);
    }
    const message =
      error instanceof Error ? error.message : "Unexpected MCP tool error";
    return errorResult(message);
  }
}

/** Register Daily Compass tools on an MCP server instance. */
export function registerDailyCompassTools(server: McpServer): void {
  server.registerTool(
    "list_areas",
    {
      title: "List areas",
      description:
        "List active life areas with id, name, slug, and weekly hour target. Use before create_task or log_time when you need a valid area slug.",
      inputSchema: listAreasSchema,
    },
    async () => runTool(() => service.listAreas()),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description:
        "List tasks (max 50). Defaults to open tasks (todo + in_progress). Filter by area slug, status (open/done/all), or dueBefore (YYYY-MM-DD).",
      inputSchema: listTasksSchema,
    },
    async (args) => runTool(() => service.listTasks(args)),
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description:
        "Create a task. Requires title and area slug (from list_areas). Optional priority (high/medium/low), dueDate (YYYY-MM-DD), and notes.",
      inputSchema: createTaskMcpSchema,
    },
    async (args) => runTool(() => service.createTask(args)),
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description:
        "Update a task by id. Pass any of title, priority, dueDate (null to clear), status (todo/in_progress/done), or notes. At least one field required.",
      inputSchema: updateTaskMcpSchema,
    },
    async (args) => runTool(() => service.updateTask(args)),
  );

  server.registerTool(
    "set_top3",
    {
      title: "Set Top 3",
      description:
        "Mark a task as one of the day's Top 3 focus items. Pass taskId and optional date (YYYY-MM-DD, defaults to today America/New_York). Enforces a maximum of 3 Top 3 tasks per day.",
      inputSchema: setTop3Schema,
    },
    async (args) => runTool(() => service.setTop3(args)),
  );

  server.registerTool(
    "log_time",
    {
      title: "Log time",
      description:
        "Log time against an area. Requires areaSlug and minutes (1–720). Optional note, date (YYYY-MM-DD, defaults to today America/New_York), and taskId.",
      inputSchema: logTimeMcpSchema,
    },
    async (args) => runTool(() => service.logTime(args)),
  );

  server.registerTool(
    "get_week_summary",
    {
      title: "Week summary",
      description:
        "Hours by area vs weekly target, plus tasks completed/open/overdue for a week. Optional weekStart (any YYYY-MM-DD in the week); defaults to the current America/New_York week (Monday start).",
      inputSchema: getWeekSummarySchema,
    },
    async (args) => runTool(() => service.getWeekSummary(args)),
  );
}
