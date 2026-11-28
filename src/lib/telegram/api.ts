import { getTelegramBotToken } from "@/lib/telegram/auth";

type TelegramApiResult = {
  ok: boolean;
  description?: string;
};

export type InlineKeyboardButton = {
  text: string;
  callback_data: string;
};

export type InlineKeyboard = {
  inline_keyboard: InlineKeyboardButton[][];
};

/**
 * Send a plain-text Telegram message (optional inline keyboard).
 * Never logs the bot token or full request body.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { replyMarkup?: InlineKeyboard },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, error: "Bot token not configured" };
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    };
    if (options?.replyMarkup) {
      body.reply_markup = options.replyMarkup;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

/** Answer a callback query (stops the loading spinner on the button). */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, error: "Bot token not configured" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text?.slice(0, 200),
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

/** Edit an existing message text and clear inline buttons. */
export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, error: "Bot token not configured" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/editMessageText`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          reply_markup: { inline_keyboard: [] },
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
