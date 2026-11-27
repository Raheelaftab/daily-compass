import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth";
import { exportTimeLogsCsv } from "@/lib/export-data";

function parseRange(request: NextRequest): { start: string; end: string } | null {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (
    !from ||
    !to ||
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to)
  ) {
    return null;
  }
  return from <= to ? { start: from, end: to } : { start: to, end: from };
}

export async function GET(request: NextRequest) {
  const ok = await verifySession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = parseRange(request);
  if (!range) {
    return NextResponse.json(
      { error: "Provide from and to as YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const csv = await exportTimeLogsCsv(range);
  const filename = `time-logs-${range.start}_${range.end}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
