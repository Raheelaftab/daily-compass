import { NextResponse } from "next/server";

import { handlePrayerCallback } from "@/lib/prayer/callbacks";
import { verifyTelegramWebhookSecret } from "@/lib/telegram/auth";
import {
  answerCallbackQuery,
  editTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram/api";
import { handleTelegramText } from "@/lib/telegram/commands";
import { getOrCreateTelegramSettings } from "@/lib/telegram/settings";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
  callback_query?: {
    id?: string;
    data?: string;
    message?: {
      message_id?: number;
      chat?: { id?: number };
      text?: string;
    };
  };
};

export async function POST(request: Request) {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (!verifyTelegramWebhookSecret(secretHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.callback_query?.id) {
      await handleCallback(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message?.chat?.id;
    const text = update.message?.text;
    if (chatId == null || !text) {
      return NextResponse.json({ ok: true });
    }

    const reply = await handleTelegramText(String(chatId), text);
    if (reply) {
      await sendTelegramMessage(String(chatId), reply);
    }
  } catch {
    // Acknowledge to Telegram so it does not retry endlessly.
    // Do not log tokens or secrets.
  }

  return NextResponse.json({ ok: true });
}

async function handleCallback(
  callback: NonNullable<TelegramUpdate["callback_query"]>,
): Promise<void> {
  const callbackId = callback.id;
  if (!callbackId) return;

  const chatId = callback.message?.chat?.id;
  const messageId = callback.message?.message_id;
  const data = callback.data ?? "";

  const settings = await getOrCreateTelegramSettings();
  if (
    chatId == null ||
    !settings.chatId ||
    settings.chatId !== String(chatId)
  ) {
    await answerCallbackQuery(callbackId, "Not authorized");
    return;
  }

  const result = await handlePrayerCallback(data);
  await answerCallbackQuery(callbackId, result.answerText);

  if (result.ok && messageId != null) {
    await editTelegramMessage(String(chatId), messageId, result.editText);
  }
}
