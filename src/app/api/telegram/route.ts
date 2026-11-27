import { NextResponse } from "next/server";

import { verifyTelegramWebhookSecret } from "@/lib/telegram/auth";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { handleTelegramText } from "@/lib/telegram/commands";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number };
    text?: string;
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

  const chatId = update.message?.chat?.id;
  const text = update.message?.text;
  if (chatId == null || !text) {
    return NextResponse.json({ ok: true });
  }

  try {
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
