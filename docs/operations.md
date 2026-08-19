# Operations

Running the thing. Setup instructions live in the root
[`README.md`](../README.md); this is what you need once it is running.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | Neon **pooled** string (hostname contains `-pooler`) in serverless. `lib/db.ts` pins `sslmode` to `verify-full`; leaving `require` in the URL also works but relies on a `pg` alias that changes in pg 9. |
| `CRON_SECRET` | In production | Checked by the scheduled cron routes (`lib/cron-auth.ts`). Empty locally is fine; empty in production leaves the routes open. |
| `GEMINI_API_KEY` | Optional | The wrap, Ask AI and the topic desk. Absent → those panels are absent or say "not configured". |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-3.5-flash`. |
| `NEWSDATA_API_KEY` | Optional | Adds the NewsData.io source to ingestion. |

## Scheduled work

Defined in [`vercel.json`](../vercel.json):

| Path | Schedule (UTC) | Duration | What breaks if it stops |
| --- | --- | --- | --- |
| `/api/cron/ingest` | `0 0 * * *` daily | seconds–minutes | The feed stops advancing; everything else still renders |
| `/api/cron/brief` | `30 1 * * *` daily | ~1 Gemini call | No "In brief" panel and no wrap for that day |

Ordering matters: brief runs 90 minutes after ingest so it summarises a fresh
day. Vercel Hobby permits one run per day per path — that ceiling is the reason
the cadence is daily rather than hourly.

## Manual operations

```bash
# Deep history — minutes, not seconds. Safe to re-run; upserts on url.
npm run backfill -- --months=23
npm run backfill -- --months=6 --queries=policy,subsidy,tech

# A full live-feed pull
npm run ingest

# Trigger the hosted crons by hand
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/ingest
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/brief
```

Ingestion is **idempotent** — every article upserts on its unique `url`, so a
re-run costs time and nothing else. A missed cron needs no repair.

## Health checks

| Question | Where to look |
| --- | --- |
| Is ingestion running? | The coverage strip at the top of `/` and `/world` |
| Which feeds have gone quiet? | `/sources` |
| Did the wrap generate? | "The wrap" panel; its note names the model and time |
| Is search healthy? | `/api/suggest?q=policy` should return in well under a second |
| Is the DB reachable? | Any page renders; empty states everywhere means it is not |

## Known failure modes

**A feed starts 404ing or emitting malformed XML.** The run logs it and
continues. Indian government feeds do this regularly. `lib/ingestion/sources.ts`
documents endpoints that were removed for exactly this reason — re-test before
adding any of them back rather than assuming they were dropped by mistake.

**Connection pool exhaustion during a long crawl.** Solved twice over:
`SourceCache` batches publisher resolution instead of firing an upsert per name,
and `withRetry` rides out dropped pooled connections with backoff. If it recurs,
those two are where to look, not the query layer.

**Search suddenly slow.** The tsvector expression in `lib/search.ts` has drifted
from the GIN index in `20260818020834_region_and_search`. Results stay correct,
which is what makes this easy to miss — every query is now a sequential scan
over ~28k rows. The two expressions must match byte for byte.

**Gemini quota exhausted or a response blocked.** `/api/ask` distinguishes a
safety block (422, "the assistant declined") from a failure (502). The wrap
simply stores `summary: null` and the highlight list stands on its own.

**A long backfill run times out.** Backfill is a local script because the full
archive crawl is a multi-minute batch job. Re-run it with fewer months or fewer
queries if your machine or network drops mid-run.

## Cost profile

Everything sits on free tiers, and the design assumes it:

| Service | Tier | Usage | Headroom |
| --- | --- | --- | --- |
| Neon Postgres | Free | ~28k rows, growing ~500/day | Comfortable; storage is the eventual limit |
| Vercel | Hobby | 2 cron paths, all pages dynamic | Cron frequency is the binding constraint |
| Gemini | Free | ~1 call/day + user-triggered Ask | Ask is unmetered per user — the first thing to watch if traffic grows |
| NewsData.io | Free | 200 credits/day | Optional; unused unless keyed |

## Deploying

1. Push to `main`.
2. Set `DATABASE_URL`, `CRON_SECRET` and any optional keys in Vercel project
   settings.
3. `npx prisma migrate deploy` once, from your machine, with `DATABASE_URL`
   pointed at production.
4. Verify the crons are registered in the Vercel dashboard.

`postinstall` runs `prisma generate`, so a cached build never serves a stale
client.
