import { afterEach, describe, expect, it } from "vitest";
import { withMcpAuth } from "mcp-handler";

import {
  extractBearerToken,
  getMcpApiToken,
  safeEqualStrings,
  verifyMcpBearerToken,
} from "./auth";

describe("safeEqualStrings", () => {
  it("returns true for equal strings", () => {
    expect(safeEqualStrings("secret-token", "secret-token")).toBe(true);
  });

  it("returns false for unequal strings of the same length", () => {
    expect(safeEqualStrings("secret-token", "secret-tokem")).toBe(false);
  });

  it("returns false for unequal lengths", () => {
    expect(safeEqualStrings("abc", "abcd")).toBe(false);
  });
});

describe("extractBearerToken", () => {
  it("extracts a Bearer token", () => {
    const req = new Request("http://localhost/api/mcp", {
      headers: { Authorization: "Bearer my-token-value" },
    });
    expect(extractBearerToken(req)).toBe("my-token-value");
  });

  it("returns undefined when Authorization is missing", () => {
    const req = new Request("http://localhost/api/mcp");
    expect(extractBearerToken(req)).toBeUndefined();
  });

  it("returns undefined for non-Bearer schemes", () => {
    const req = new Request("http://localhost/api/mcp", {
      headers: { Authorization: "Basic abc" },
    });
    expect(extractBearerToken(req)).toBeUndefined();
  });
});

describe("verifyMcpBearerToken + HTTP 401", () => {
  const previous = process.env.MCP_API_TOKEN;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.MCP_API_TOKEN;
    } else {
      process.env.MCP_API_TOKEN = previous;
    }
  });

  it("reads MCP_API_TOKEN from the environment", () => {
    process.env.MCP_API_TOKEN = " env-token ";
    expect(getMcpApiToken()).toBe("env-token");
  });

  it("accepts the correct token", async () => {
    process.env.MCP_API_TOKEN = "correct-token";
    const req = new Request("http://localhost/api/mcp", {
      headers: { Authorization: "Bearer correct-token" },
    });
    const info = await verifyMcpBearerToken(req);
    expect(info?.clientId).toBe("mcp-client");
    expect(info?.scopes).toContain("daily-compass");
  });

  it("rejects a wrong token", async () => {
    process.env.MCP_API_TOKEN = "correct-token";
    const req = new Request("http://localhost/api/mcp", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(await verifyMcpBearerToken(req)).toBeUndefined();
  });

  it("rejects a missing token", async () => {
    process.env.MCP_API_TOKEN = "correct-token";
    const req = new Request("http://localhost/api/mcp");
    expect(await verifyMcpBearerToken(req)).toBeUndefined();
  });

  it("returns 401 for missing Authorization on the MCP handler", async () => {
    process.env.MCP_API_TOKEN = "correct-token";
    const okHandler = async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 });
    const secured = withMcpAuth(okHandler, verifyMcpBearerToken, {
      required: true,
      requiredScopes: ["daily-compass"],
    });

    const res = await secured(new Request("http://localhost/api/mcp"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for a wrong token on the MCP handler", async () => {
    process.env.MCP_API_TOKEN = "correct-token";
    const okHandler = async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 });
    const secured = withMcpAuth(okHandler, verifyMcpBearerToken, {
      required: true,
      requiredScopes: ["daily-compass"],
    });

    const res = await secured(
      new Request("http://localhost/api/mcp", {
        headers: { Authorization: "Bearer wrong-token" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("allows a correct token through the MCP handler", async () => {
    process.env.MCP_API_TOKEN = "correct-token";
    const okHandler = async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 });
    const secured = withMcpAuth(okHandler, verifyMcpBearerToken, {
      required: true,
      requiredScopes: ["daily-compass"],
    });

    const res = await secured(
      new Request("http://localhost/api/mcp", {
        headers: { Authorization: "Bearer correct-token" },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
