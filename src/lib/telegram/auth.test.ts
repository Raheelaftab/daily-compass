import { afterEach, describe, expect, it } from "vitest";

import {
  verifyCronBearer,
  verifyPairCode,
  verifyTelegramWebhookSecret,
} from "./auth";

describe("telegram webhook secret", () => {
  const previous = process.env.TELEGRAM_WEBHOOK_SECRET;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
    } else {
      process.env.TELEGRAM_WEBHOOK_SECRET = previous;
    }
  });

  it("rejects missing secret or header", () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(verifyTelegramWebhookSecret("x")).toBe(false);
    process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
    expect(verifyTelegramWebhookSecret(null)).toBe(false);
  });

  it("accepts a matching header", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret";
    expect(verifyTelegramWebhookSecret("webhook-secret")).toBe(true);
    expect(verifyTelegramWebhookSecret("wrong")).toBe(false);
  });
});

describe("pair code", () => {
  const previous = process.env.TELEGRAM_PAIR_CODE;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.TELEGRAM_PAIR_CODE;
    } else {
      process.env.TELEGRAM_PAIR_CODE = previous;
    }
  });

  it("verifies the pair code", () => {
    process.env.TELEGRAM_PAIR_CODE = "PAIR-123";
    expect(verifyPairCode("PAIR-123")).toBe(true);
    expect(verifyPairCode("nope")).toBe(false);
  });
});

describe("cron bearer", () => {
  const previous = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
  });

  it("requires a matching Bearer token", () => {
    process.env.CRON_SECRET = "cron-secret";
    expect(
      verifyCronBearer(
        new Request("http://localhost/api/cron/morning", {
          headers: { Authorization: "Bearer cron-secret" },
        }),
      ),
    ).toBe(true);
    expect(
      verifyCronBearer(
        new Request("http://localhost/api/cron/prayer", {
          headers: { Authorization: "Bearer cron-secret" },
        }),
      ),
    ).toBe(true);
    expect(
      verifyCronBearer(
        new Request("http://localhost/api/cron/prayer", {
          headers: { Authorization: "Bearer wrong" },
        }),
      ),
    ).toBe(false);
    expect(
      verifyCronBearer(new Request("http://localhost/api/cron/morning")),
    ).toBe(false);
  });
});
