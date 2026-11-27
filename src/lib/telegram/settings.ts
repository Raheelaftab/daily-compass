import { eq } from "drizzle-orm";

import { db } from "@/db";
import { telegramSettings } from "@/db/schema";

export type TelegramSettingsRow = {
  id: number;
  chatId: string | null;
  morningDigest: boolean;
  eveningNudge: boolean;
};

/** Ensure a single telegram_settings row exists and return it. */
export async function getOrCreateTelegramSettings(): Promise<TelegramSettingsRow> {
  const [existing] = await db.select().from(telegramSettings).limit(1);
  if (existing) {
    return {
      id: existing.id,
      chatId: existing.chatId,
      morningDigest: existing.morningDigest,
      eveningNudge: existing.eveningNudge,
    };
  }

  const [created] = await db
    .insert(telegramSettings)
    .values({})
    .returning();

  return {
    id: created.id,
    chatId: created.chatId,
    morningDigest: created.morningDigest,
    eveningNudge: created.eveningNudge,
  };
}

export async function setTelegramChatId(chatId: string): Promise<void> {
  const settings = await getOrCreateTelegramSettings();
  await db
    .update(telegramSettings)
    .set({ chatId })
    .where(eq(telegramSettings.id, settings.id));
}

export async function updateTelegramDigestToggles(input: {
  morningDigest?: boolean;
  eveningNudge?: boolean;
}): Promise<TelegramSettingsRow> {
  const settings = await getOrCreateTelegramSettings();
  const patch: {
    morningDigest?: boolean;
    eveningNudge?: boolean;
  } = {};
  if (input.morningDigest !== undefined) {
    patch.morningDigest = input.morningDigest;
  }
  if (input.eveningNudge !== undefined) {
    patch.eveningNudge = input.eveningNudge;
  }

  const [updated] = await db
    .update(telegramSettings)
    .set(patch)
    .where(eq(telegramSettings.id, settings.id))
    .returning();

  return {
    id: updated.id,
    chatId: updated.chatId,
    morningDigest: updated.morningDigest,
    eveningNudge: updated.eveningNudge,
  };
}
