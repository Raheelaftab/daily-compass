import { withMcpAuth } from "mcp-handler";
import { NextResponse } from "next/server";

import { verifyMcpBearerToken } from "@/lib/mcp/auth";
import { handleMcpJsonPost } from "@/lib/mcp/http-handler";

/** Keep tool calls short-lived on Vercel (no open SSE streams). */
export const maxDuration = 30;

const postHandler = withMcpAuth(handleMcpJsonPost, verifyMcpBearerToken, {
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
