import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runBackfill } from "@/lib/ingestion/backfill";

export const maxDuration = 60;

// A full historical crawl runs for minutes — far past any serverless limit —
// so this route only ever walks a few months per call. Deployments that want
// deep history should run `npm run backfill` locally instead, or call this
// repeatedly with an increasing `months` value.
const MAX_MONTHS_PER_REQUEST = 2;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requested = Number.parseInt(req.nextUrl.searchParams.get("months") ?? "1", 10);
  const monthsBack = Math.min(
    Number.isFinite(requested) && requested >= 0 ? requested : 1,
    MAX_MONTHS_PER_REQUEST
  );

  const results = await runBackfill({ monthsBack });
  const totals = results.reduce(
    (acc, r) => ({
      fetched: acc.fetched + r.fetched,
      created: acc.created + r.created,
      duplicate: acc.duplicate + r.duplicate,
      skipped: acc.skipped + r.skipped,
      errors: acc.errors + (r.error ? 1 : 0),
    }),
    { fetched: 0, created: 0, duplicate: 0, skipped: 0, errors: 0 }
  );

  return NextResponse.json({ ok: true, monthsBack, totals, results });
}
