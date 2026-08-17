import { NextRequest } from "next/server";

// Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` on its
// scheduled requests when CRON_SECRET is set as a project env var. Locally,
// pass the same header manually (or leave CRON_SECRET unset for open dev use).
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
