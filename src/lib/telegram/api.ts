import { getTelegramBotToken } from "@/lib/telegram/auth";

type TelegramApiResult = {
  ok: boolean;
  description?: string;
};

/**
 * Send a plain-text Telegram message.
 * Never logs the bot token or full request body.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, error: "Bot token not configured" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      },
    );

    const data = (await response.json()) as TelegramApiResult;
    if (!response.ok || !data.ok) {
      return { ok: false, error: data.description ?? "Telegram API error" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to reach Telegram" };
  }
}
