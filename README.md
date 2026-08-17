# India Policy & Business Dashboard

A dashboard that pulls together, on a schedule, what's happening in India across:
policy & regulation, subsidies & schemes, business & startups, tech & innovation
pushes, the economy & markets, investment/FDI, trade (import/export), and
geopolitics — from ~35 official government and business-news RSS feeds, a dated
news-archive crawl that backfills months of history, and (optionally) the
NewsData.io API.

## How it works

- **`lib/ingestion/`** — one module per source type. RSS sources (`rss.ts`) are
  fetched and normalized from the feed list in `sources.ts` (PIB, RBI, SEBI, PM
  India, plus the Economic Times / Business Standard / Mint / BusinessLine /
  The Hindu / Indian Express / Moneycontrol / Inc42 desks); `googleNews.ts`
  queries a dated news archive; the optional NewsData.io source (`newsdata.ts`)
  only runs if `NEWSDATA_API_KEY` is set. `run.ts` orchestrates all of them.
- **Historical backfill (`lib/ingestion/backfill.ts`, `npm run backfill`)** — RSS
  only ever exposes a publisher's latest few dozen items, which is why a fresh
  install starts out showing "the last few days" and nothing else. The backfill
  walks the Google News archive month by month with `after:`/`before:` date
  operators, running eight India-scoped topical queries per month, and
  attributes each story to its actual publisher rather than to the aggregator.
  A single crawl of two years pulls in thousands of stories.
- **`lib/categorize.ts`** — a keyword-based rule set assigns each article to one
  of the 8 categories, independent of which source it came from, plus a
  cross-cutting sub-domain tag (25 curated sectors — renewable energy, ports &
  shipping, fintech, MSME, etc). If nothing matches, the card falls back to
  showing its category as the tag, so every card always has at least one.
- **Dedup** — every article is upserted on its `url` (unique). Because wire copy
  is republished under many URLs, ingestion *also* compares a normalized
  headline (`lib/ingestion/dedupe.ts`) against everything already stored in the
  window being processed, so five outlets carrying the same PTI story produce
  one entry.
- **Filters** — the feed and every category page support a time-range filter
  (24h/7d/1m/3m/1y/all, `?range=`), a browse-by-month picker covering a rolling
  24 months (`?month=`), a sector filter (`?tag=`), and pagination (`?page=`) —
  all combinable and shareable as URLs.
- **Reading order** — the page opens on a scored lead rather than whatever is
  newest (`lib/leadStory.ts`): a story with a real deck, from a curated feed,
  and not a routine auction result or numbered circular. The feed below is
  grouped by IST day, each day opening with a feature and dropping into
  scannable rows.
- **"Ask AI" per article** — every story has an "Ask" button that calls Claude
  (via `/api/ask`) with just that article's headline/excerpt/metadata to answer
  a free-text question about it, in an overlay with a few starter prompts.
  Needs `ANTHROPIC_API_KEY`; without it the overlay shows a clear
  "not configured" error instead of failing silently.
- **`/api/cron/ingest`** — pulls all sources and stores new articles. Scheduled
  daily via `vercel.json` (Vercel Hobby plan allows at most once/day per cron;
  see "Going faster than daily" below).
- **`/api/cron/brief`** — builds the "In brief" panel from the last 24h of
  articles, a handful of highlights per category, which the front page
  interleaves so one busy category can't fill the whole list. Scheduled daily,
  after ingestion.
- **`/api/cron/backfill`** — a serverless-sized slice of the archive crawl (at
  most two months per call, to stay inside the function timeout). For real
  history, run `npm run backfill` locally instead.
- All three cron routes are protected by `CRON_SECRET` (see below).

We deliberately store only a **headline, short excerpt, and link back to the
source** — never full article text — both to stay on solid fair-use footing for
the news sources and to keep this an aggregator, not a republisher. See the
`/sources` page in the running app for exactly what's being pulled from where.

## Local setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npx prisma migrate dev --name init
npm run dev
```

Visit `http://localhost:3000`. With no data ingested yet you'll see empty
states. Populate them:

```bash
# Two years of history from the news archive (a few minutes; safe to re-run).
npm run backfill -- --months=23

# Then the live feeds, and the daily brief.
curl http://localhost:3000/api/cron/ingest
curl http://localhost:3000/api/cron/brief
```

`npm run backfill` also accepts `--queries=policy,subsidy,tech,startups,`
`investment,economy,trade,geopolitics` to crawl only some topics.

## Getting a database (Neon, free tier)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (hostname contains `-pooler`) — this
   matters for serverless (Vercel) so connections don't exhaust the DB's limit.
3. Put it in `.env` as `DATABASE_URL`, then run `npx prisma migrate dev --name init`
   to create the tables.

## Getting a NewsData.io key (optional, free tier)

1. Sign up at [newsdata.io](https://newsdata.io) (free tier: 200 credits/day,
   allows commercial use, has India + business/politics filters).
2. Copy the API key into `.env` as `NEWSDATA_API_KEY`.
3. Ingestion picks it up automatically on the next run — no code changes.

## Getting an Anthropic API key (optional, for "Ask AI")

1. Create a key at [console.anthropic.com](https://console.anthropic.com).
2. Copy it into `.env` as `ANTHROPIC_API_KEY`.
3. Restart the dev server — no code changes needed. This calls `claude-opus-5`
   per question (2-4 sentence answers, capped at 1024 output tokens); there's
   no per-user rate limiting on `/api/ask` since the app has no auth layer —
   fine for personal/local use, worth adding a limiter before a public deploy.

## Deploying to Vercel

1. Push this repo to GitHub (or another git provider Vercel supports).
2. In Vercel: **New Project** → import the repo.
3. Add environment variables in the Vercel project settings: `DATABASE_URL`
   (and `NEWSDATA_API_KEY` / `ANTHROPIC_API_KEY` if you have them).
4. Generate a random string and set it as `CRON_SECRET` in Vercel's env vars —
   Vercel Cron then automatically sends it as a bearer token on scheduled
   requests, so nobody else can trigger your ingestion/brief routes.
5. Deploy. `vercel.json` already defines the two daily cron jobs; Vercel picks
   them up automatically.
6. Run `npx prisma migrate deploy` once against the production `DATABASE_URL`
   (from your machine, with `DATABASE_URL` pointed at prod) to create the
   tables before the first cron run.

### Going faster than daily

Vercel's Hobby plan limits cron jobs to once/day. On a **Pro** plan you can
edit `vercel.json` to run `/api/cron/ingest` more often, e.g. every 2 hours:

```json
{ "path": "/api/cron/ingest", "schedule": "0 */2 * * *" }
```

`/api/cron/backfill?months=1` is worth a weekly slot too — the archive keeps
indexing stories after they're published, so a re-crawl of the last month or
two picks up items the live feeds missed.

Keep `/api/cron/brief` at once/day (it summarizes the last 24h, more frequent
runs don't add value) but schedule it *after* whatever your last ingest run of
the day is.

## What's next (Phase 2)

- PRS India (legislative tracker), Startup India schemes feed, DGFT/TRADESTAT
  trade-data scraping, MEA geopolitics — all HTML-scrape-only sources, each
  needs its own bespoke, more fragile scraper.
- Optional LLM-based re-categorization / "why this matters" enrichment.
- Optional Google Trends widget (no reliable free API exists today — `pytrends`
  is unmaintained/rate-limited; SerpApi is a paid alternative).
