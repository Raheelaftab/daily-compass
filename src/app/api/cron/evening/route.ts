import { NextResponse } from "next/server";

import { verifyCronBearer } from "@/lib/telegram/auth";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { buildEveningNudge } from "@/lib/telegram/commands";
import { getOrCreateTelegramSettings } from "@/lib/telegram/settings";

export async function GET(request: Request) {
  if (!verifyCronBearer(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getOrCreateTelegramSettings();
  if (!settings.eveningNudge) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }
  if (!settings.chatId) {
    return NextResponse.json({ ok: true, skipped: "unpaired" });
  }

  const text = await buildEveningNudge();
  const sent = await sendTelegramMessage(settings.chatId, text);
  if (!sent.ok) {
    return NextResponse.json({ ok: false, error: sent.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
