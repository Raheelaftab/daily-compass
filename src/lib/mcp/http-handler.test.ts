import { afterEach, describe, expect, it } from "vitest";

import { ensureFiniteJsonResponse, handleMcpJsonPost } from "./http-handler";
import { withMcpAuth } from "mcp-handler";

import { verifyMcpBearerToken } from "./auth";

describe("ensureFiniteJsonResponse", () => {
  it("returns 202 with an empty body for notifications", async () => {
    const res = await ensureFiniteJsonResponse(new Response(null, { status: 202 }));
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("buffers SSE into a finished JSON response", async () => {
    const sse = [
      "event: message",
      `data: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: { ok: true } })}`,
      "",
    ].join("\n");
    const streamed = new Response(sse, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
    const res = await ensureFiniteJsonResponse(streamed);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-type")).not.toContain("text/event-stream");
    await expect(res.json()).resolves.toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: { ok: true },
    });
    expect(res.bodyUsed).toBe(true);
  });
});

describe("MCP JSON POST transport", () => {
  const previous = process.env.MCP_API_TOKEN;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.MCP_API_TOKEN;
    } else {
      process.env.MCP_API_TOKEN = previous;
    }
  });

  it("returns JSON and completes when Accept includes text/event-stream", async () => {
    process.env.MCP_API_TOKEN = "mcp-test-token";
    const secured = withMcpAuth(handleMcpJsonPost, verifyMcpBearerToken, {
      required: true,
      requiredScopes: ["daily-compass"],
    });

    const res = await secured(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          Authorization: "Bearer mcp-test-token",
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "vitest", version: "1.0.0" },
          },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type") ?? "";
    expect(contentType).toContain("application/json");
    expect(contentType).not.toContain("text/event-stream");

    const body = await res.json();
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(1);
    expect(body.result?.serverInfo?.name).toBe("daily-compass");
    expect(res.bodyUsed).toBe(true);
  });

  it("returns 202 with no body for a JSON-RPC notification", async () => {
    process.env.MCP_API_TOKEN = "mcp-test-token";
    const secured = withMcpAuth(handleMcpJsonPost, verifyMcpBearerToken, {
      required: true,
      requiredScopes: ["daily-compass"],
    });

    const res = await secured(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          Authorization: "Bearer mcp-test-token",
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      }),
    );

    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });
});
