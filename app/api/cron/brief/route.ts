import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { generateDailyBrief } from "@/lib/brief";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brief = await generateDailyBrief();
  return NextResponse.json({ ok: true, brief });
}
