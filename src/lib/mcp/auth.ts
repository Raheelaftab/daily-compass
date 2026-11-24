import { timingSafeEqual } from "node:crypto";

import type { AuthInfo } from "@modelcontextprotocol/server";

/**
 * Constant-time string compare. Different lengths still run a dummy compare
 * so length alone is not an easy timing oracle.
 */
export function safeEqualStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/** Read MCP_API_TOKEN from the environment (never log this value). */
export function getMcpApiToken(): string {
  return process.env.MCP_API_TOKEN?.trim() ?? "";
}

/**
 * Extract a Bearer token from Authorization. Returns undefined if missing or
 * not Bearer. Does not log the token.
 */
export function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) return undefined;
  return match[1].trim();
}

/**
 * Verify the request Bearer token against MCP_API_TOKEN.
 * Returns AuthInfo on success, undefined on failure (→ 401 via withMcpAuth).
 */
export async function verifyMcpBearerToken(
  request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const expected = getMcpApiToken();
  if (!expected) {
    return undefined;
  }

  const token = bearerToken ?? extractBearerToken(request);
  if (!token || !safeEqualStrings(token, expected)) {
    return undefined;
  }

  return {
    token,
    clientId: "mcp-client",
    scopes: ["daily-compass"],
  };
}
