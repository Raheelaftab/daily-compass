import { NextResponse } from "next/server";

import { runPrayerCronTick } from "@/lib/prayer/cron";
import { logPrayerError } from "@/lib/prayer/errors";
import { verifyCronBearer } from "@/lib/telegram/auth";

async function handle(request: Request) {
  if (!verifyCronBearer(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPrayerCronTick();
    return NextResponse.json(result);
  } catch (error) {
    logPrayerError("cron /api/cron/prayer", error);
    return NextResponse.json(
      { ok: false, error: "Prayer cron failed" },
      { status: 500 },
    );
  }
}

/** cron-job.org (and Vercel) may use GET or POST. */
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
