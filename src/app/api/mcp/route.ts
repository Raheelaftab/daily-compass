import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { NextResponse } from "next/server";

import { verifyMcpBearerToken } from "@/lib/mcp/auth";
import { registerDailyCompassTools } from "@/lib/mcp/server";

/** Keep tool calls short-lived on Vercel (no open SSE streams). */
export const maxDuration = 30;

const mcpHandler = createMcpHandler(
  (server) => {
    registerDailyCompassTools(server);
  },
  {
    serverInfo: {
      name: "daily-compass",
      version: "1.0.0",
    },
    instructions:
      "Daily Compass MCP server. Manage areas, tasks, Top 3, time logs, and week summaries. All dates are America/New_York calendar dates as YYYY-MM-DD. There is no delete tool.",
  },
);

const postHandler = withMcpAuth(mcpHandler, verifyMcpBearerToken, {
  required: true,
  requiredScopes: ["daily-compass"],
});

/** Stateless JSON request/response only — no long-lived GET/SSE streams. */
export async function GET() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export async function DELETE() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export { postHandler as POST };
