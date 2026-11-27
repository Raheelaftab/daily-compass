import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { proxy, shouldBypassSessionAuth, config } from "./proxy";

function req(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(new URL(path, "http://localhost:3000"), init);
}

describe("shouldBypassSessionAuth", () => {
  it("lets telegram and cron through without a session", () => {
    expect(shouldBypassSessionAuth("/api/telegram")).toBe(true);
    expect(shouldBypassSessionAuth("/api/telegram/")).toBe(true);
    expect(shouldBypassSessionAuth("/api/cron/morning")).toBe(true);
    expect(shouldBypassSessionAuth("/api/cron/evening")).toBe(true);
    expect(shouldBypassSessionAuth("/api/mcp")).toBe(true);
  });

  it("still protects app pages and other API routes", () => {
    expect(shouldBypassSessionAuth("/")).toBe(false);
    expect(shouldBypassSessionAuth("/tasks")).toBe(false);
    expect(shouldBypassSessionAuth("/settings")).toBe(false);
    expect(shouldBypassSessionAuth("/api/export/tasks")).toBe(false);
    expect(shouldBypassSessionAuth("/api/export/time-logs")).toBe(false);
  });
});

describe("proxy matcher", () => {
  it("excludes telegram and cron from the matcher pattern", () => {
    const pattern = config.matcher[0];
    expect(pattern).toContain("api/telegram");
    expect(pattern).toContain("api/cron/");

    const source = pattern.replace(/^\//, "");
    // Mimic Next matcher: path without leading slash against the capture group.
    const re = new RegExp(`^${source}$`);
    expect(re.test("api/telegram")).toBe(false);
    expect(re.test("api/cron/morning")).toBe(false);
    expect(re.test("api/cron/evening")).toBe(false);
    expect(re.test("tasks")).toBe(true);
    expect(re.test("api/export/tasks")).toBe(true);
    expect(re.test("api/mcp")).toBe(true);
  });
});

describe("proxy()", () => {
  const previousSecret = process.env.AUTH_SECRET;

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = previousSecret;
    }
  });

  it("does not redirect unauthenticated telegram/cron requests to login", async () => {
    delete process.env.AUTH_SECRET;
    const telegram = await proxy(req("/api/telegram", { method: "POST" }));
    expect(telegram.status).toBe(200);
    expect(telegram.headers.get("location")).toBeNull();

    const cron = await proxy(req("/api/cron/morning"));
    expect(cron.status).toBe(200);
    expect(cron.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated protected routes to /login", async () => {
    delete process.env.AUTH_SECRET;
    const res = await proxy(req("/tasks"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });
});
