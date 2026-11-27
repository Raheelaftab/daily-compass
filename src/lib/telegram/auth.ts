import { safeEqualStrings } from "@/lib/mcp/auth";

/** Read webhook secret from env (never log). */
export function getTelegramWebhookSecret(): string {
  return process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
}

/** Read pair code from env (never log). */
export function getTelegramPairCode(): string {
  return process.env.TELEGRAM_PAIR_CODE?.trim() ?? "";
}

/** Read bot token from env (never log). */
export function getTelegramBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

/** Read cron secret from env (never log). */
export function getCronSecret(): string {
  return process.env.CRON_SECRET?.trim() ?? "";
}

/**
 * Verify Telegram webhook secret header.
 * Header: X-Telegram-Bot-Api-Secret-Token
 */
export function verifyTelegramWebhookSecret(
  headerValue: string | null,
): boolean {
  const expected = getTelegramWebhookSecret();
  if (!expected || !headerValue) return false;
  return safeEqualStrings(headerValue, expected);
}

/** Verify Authorization: Bearer CRON_SECRET. */
export function verifyCronBearer(request: Request): boolean {
  const expected = getCronSecret();
  if (!expected) return false;
  const header = request.headers.get("authorization");
  if (!header) return false;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) return false;
  return safeEqualStrings(match[1].trim(), expected);
}

/** True when the provided pair code matches TELEGRAM_PAIR_CODE. */
export function verifyPairCode(code: string): boolean {
  const expected = getTelegramPairCode();
  if (!expected || !code) return false;
  return safeEqualStrings(code.trim(), expected);
}
