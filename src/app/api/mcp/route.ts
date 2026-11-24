import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { verifyMcpBearerToken } from "@/lib/mcp/auth";
import { registerDailyCompassTools } from "@/lib/mcp/server";

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

const handler = withMcpAuth(mcpHandler, verifyMcpBearerToken, {
  required: true,
  requiredScopes: ["daily-compass"],
});

export { handler as GET, handler as POST, handler as DELETE };
