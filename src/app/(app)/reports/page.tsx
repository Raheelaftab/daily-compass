import { connection } from "next/server";
import { redirect } from "next/navigation";

import { todayStr, weekStart } from "@/lib/dates";

export default async function ReportsIndexPage() {
  await connection();
  redirect(`/reports/${weekStart(todayStr())}`);
}
