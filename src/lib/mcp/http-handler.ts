import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
  type AuthInfo,
} from "@modelcontextprotocol/server";

import { registerDailyCompassTools } from "@/lib/mcp/server";

type AuthedRequest = Request & { auth?: AuthInfo };

const SERVER_INFO = {
  name: "daily-compass",
  version: "1.0.0",
} as const;

const INSTRUCTIONS =
  "Daily Compass MCP server. Manage areas, tasks, Top 3, time logs, and week summaries. All dates are America/New_York calendar dates as YYYY-MM-DD. There is no delete tool.";

/**
 * If a transport still returns SSE, buffer events into a finished JSON body
 * so the Vercel function can close (no hanging ReadableStream).
 */
export async function ensureFiniteJsonResponse(
  response: Response,
): Promise<Response> {
  if (response.status === 202) {
    return new Response(null, {
      status: 202,
      headers: { Allow: "POST" },
    });
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.body) {
    return new Response(null, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const text = await response.text();

  if (contentType.includes("text/event-stream")) {
    const messages: unknown[] = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        messages.push(JSON.parse(raw));
      } catch {
        // Skip non-JSON SSE priming/keepalive lines.
      }
    }
    const payload = messages.length === 1 ? messages[0] : messages;
    return Response.json(payload ?? null, { status: 200 });
  }

  const headers = new Headers(response.headers);
  if (!headers.get("content-type")?.includes("application/json")) {
    headers.set("Content-Type", "application/json");
  }
  return new Response(text, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Stateless Streamable HTTP POST with enableJsonResponse: true.
 * Never opens a long-lived SSE stream, even when Accept includes text/event-stream.
 */
export async function handleMcpJsonPost(req: Request): Promise<Response> {
  const authInfo = (req as AuthedRequest).auth;

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error: Invalid JSON body" },
        id: null,
      },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS });
  registerDailyCompassTools(server);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  // Transport Accept checks still want both types; JSON mode returns JSON anyway.
  const headers = new Headers(req.headers);
  headers.set("Accept", "application/json, text/event-stream");
  headers.set("Content-Type", "application/json");

  const forward = new Request(req.url, {
    method: "POST",
    headers,
  });

  try {
    const response = await transport.handleRequest(forward, {
      authInfo,
      parsedBody,
    });
    return await ensureFiniteJsonResponse(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal MCP handler error";
    console.error(`[mcp] POST failed: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error" },
        id: null,
      },
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  } finally {
    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  }
}
