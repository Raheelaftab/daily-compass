import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-constants";

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return payload.sub === "owner";
  } catch {
    return false;
  }
}

/**
 * Paths that must not go through the cookie session gate.
 * Telegram + cron also belong in the matcher exclusion so Proxy never runs
 * (Next.js buffers request bodies when Proxy matches, which can prevent the
 * route handler from executing).
 */
export function shouldBypassSessionAuth(pathname: string): boolean {
  if (pathname === "/api/mcp" || pathname.startsWith("/api/mcp/")) {
    return true;
  }
  if (pathname === "/api/telegram" || pathname.startsWith("/api/telegram/")) {
    return true;
  }
  if (pathname.startsWith("/api/cron/")) {
    return true;
  }
  if (pathname === "/sw.js" || pathname === "/offline") {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypassSessionAuth(pathname)) {
    return NextResponse.next();
  }

  const isLogin = pathname === "/login";
  const loggedIn = await hasValidSession(request);

  if (isLogin) {
    if (loggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!loggedIn) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match app routes for session auth, but never run Proxy for:
     * - /api/telegram (Telegram verifies X-Telegram-Bot-Api-Secret-Token)
     * - /api/cron/* (Cron verifies Authorization: Bearer CRON_SECRET)
     * - static assets / Next internals
     *
     * Excluding telegram/cron from the matcher is required so Proxy does not
     * buffer their bodies and block the route handlers.
     */
    "/((?!api/telegram(?:/|$)|api/cron/|_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
