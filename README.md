# Meridian - policy, business & markets

**A daily intelligence brief for India.** Meridian ingests ~95 government,
regulator and newsroom feeds three times a day, sorts every story into eight
sections and twenty-five sectors, and presents the result as something you read
rather than something you monitor - a scored lead, a machine-written wrap of the
last 24 hours, per-sector coverage momentum, and six "reader desks" that re-rank
the same archive for whoever is looking at it.

Built by **[Vedant Solanki](https://www.linkedin.com/in/solanki-vedant/)** ·
[Source](https://github.com/solankivedant/Meridian-Intelligence)

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 7 + Postgres (Neon) ·
GitHub Actions for scheduling

---

A dashboard that pulls together, on a schedule, what's happening in India across:
policy & regulation, subsidies & schemes, business & startups, tech & innovation
pushes, the economy & markets, investment/FDI, trade (import/export), and
geopolitics - from ~35 official government and business-news RSS feeds, a dated
news-archive crawl that backfills months of history, and (optionally) the
NewsData.io API.

## How it works

- **`lib/ingestion/`** - one module per source type. RSS sources (`rss.ts`) are
  fetched and normalized from the feed list in `sources.ts` (PIB, RBI, SEBI, PM
  India, plus the Economic Times / Business Standard / Mint / BusinessLine /
  The Hindu / Indian Express / Moneycontrol / Inc42 desks); `googleNews.ts`
  queries a dated news archive; the optional NewsData.io source (`newsdata.ts`)
  only runs if `NEWSDATA_API_KEY` is set. `run.ts` orchestrates all of them.
- **Historical backfill (`lib/ingestion/backfill.ts`, `npm run backfill`)** - RSS
  only ever exposes a publisher's latest few dozen items, which is why a fresh
  install starts out showing "the last few days" and nothing else. The backfill
  walks the Google News archive month by month with `after:`/`before:` date
  operators, running eight India-scoped topical queries per month, and
  attributes each story to its actual publisher rather than to the aggregator.
  A single crawl of two years pulls in thousands of stories.
- **`lib/categorize.ts`** - a keyword-based rule set assigns each article to one
  of the 8 categories, independent of which source it came from, plus a
  cross-cutting sub-domain tag (25 curated sectors - renewable energy, ports &
  shipping, fintech, MSME, etc). If nothing matches, the card falls back to
  showing its category as the tag, so every card always has at least one.
- **Dedup** - every article is upserted on its `url` (unique). Because wire copy
  is republished under many URLs, ingestion *also* compares a normalized
  headline (`lib/ingestion/dedupe.ts`) against everything already stored in the
  window being processed, so five outlets carrying the same PTI story produce
  one entry.
- **Filters** - every feed supports a time-range filter (24h/7d/1m/3m/1y/all,
  `?range=`), a browse-by-month picker covering a rolling 24 months (`?month=`),
  multi-select section (`?cats=`) and sector (`?tags=`) pickers, a sort
  (`?sort=new|old|section`) and pagination (`?page=`) - all combinable,
  all shareable as URLs, and all preserved across paging.
- **Page size follows the device** - forty stories is a page on a laptop and
  roughly twenty screens of thumb on a phone, so `lib/viewport.ts` reads the
  User-Agent for the `Mobi` token and phones get ten. Tablets deliberately do
  not match it: Android tablets drop the token and iPadOS reports as a Mac.
- **"By section" is a board, not a sort** - `?sort=section` drops the flat feed
  for one box per section, each showing two rows and paging in place, so the
  busiest two sections cannot eat the page (`lib/sectionBoard.ts`).
- **The sector desk (`/opportunities`)** - 25 sectors ranked by coverage
  momentum, state support and visible capital, computed in cached raw-SQL passes
  over `unnest(tags)` (`lib/opportunity.ts`), with hand-rolled inline-SVG charts
  and no chart library. Momentum is each sector's *share* of all coverage rather
  than its story count - the archive's own volume grows as it backfills, and
  measured absolutely every sector looks like it is accelerating.
- **Reader desks (`/for`)** - the same archive re-ranked for six jobs: citizen,
  student, founder, business owner, investor and public sector. A desk is a
  weighted set of sections and sectors (`lib/personas.ts`), not a stored tag, so
  one lives or dies in a single file and every figure on it is the same measured
  figure as everywhere else. Each carries a ranked front page, its tracked
  sectors with their signals and latest stories, and the archive scoped to it.
- **Reading order** - the page opens on a scored lead rather than whatever is
  newest (`lib/leadStory.ts`): a story with a real deck, from a curated feed,
  and not a routine auction result or numbered circular. The feed below is
  grouped by IST day, each day opening with a feature and dropping into
  scannable rows.
- **"The wrap" - an AI-written daily summary** - the same 24-hour headlines
  that fill the brief are sent to Gemini, which writes a short standfirst plus
  3-5 category-tagged takeaways (`lib/summarize.ts`). Stored on the day's
  `DailyBrief` row and rendered at the top of the home page. Needs
  `GEMINI_API_KEY`; without it the brief still generates, just without the
  written summary.
- **"Ask AI" per article (off by default)** - an "Ask" button on every story
  that calls Gemini (via `/api/ask`, `lib/gemini.ts`) with just that article's
  headline/excerpt/metadata to answer a free-text question about it, in an
  overlay with a few starter prompts. **Disabled unless `NEXT_PUBLIC_ENABLE_ASK`
  is exactly `"true"`** - it is the one Gemini feature whose cost scales with
  traffic instead of with content, so a public deployment leaving it on is an
  open tap on your API key. The flag gates the button *and* the route: with it
  unset, `/api/ask` returns 404 no matter who posts to it. See
  `lib/features.ts`.
- **The market desk (`/markets`)** - the same archive read for who it names and
  what it changes, in four surfaces. `/company` gives every one of ~300 curated
  Indian businesses its own timeline, matched by dictionary rather than by an
  NER model (`lib/entities.ts`) and stored on `Article.entities` at ingest.
  `/issuance` recovers the primary-issuance pipeline - IPO, QIP, rights, OFS,
  buyback, block deal - from headlines, split by instrument and by stage.
  `/regulators` separates what 24 regulators actually issued into circulars,
  master directions, penalties and consultation papers, and marks which of them
  bind anyone. `/calendar` generates the fiscal, tax, results and derivatives
  dates from rules rather than from a typed list, and flags anything it cannot
  confirm. The desk also carries the bridge from each sector to the index that
  tracks it - including the four that nothing on either exchange tracks, and the
  nine more where the only mapping is a loose proxy.
  **There are no prices anywhere on it:** exchange data is licensed, this
  project holds no licence, and every figure is a count of coverage.
- **`/api/cron/ingest`** - pulls all sources and stores new articles.
- **`/api/cron/brief`** - builds the "In brief" panel from the last 24h of
  articles, a handful of highlights per category, which the front page
  interleaves so one busy category can't fill the whole list.
- Both cron routes are protected by `CRON_SECRET` (see below). Neither is on a
  timer any more - see "The schedule" below for why, and for what runs them.

We deliberately store only a **headline, short excerpt, and link back to the
source** - never full article text - both to stay on solid fair-use footing for
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

# Attribute the stored archive to companies. The entities column is created
# empty by its migration, so the market desk is blank until this has run.
npm run entities -- --apply

# Then the live feeds, and the daily brief.
curl http://localhost:3000/api/cron/ingest
curl http://localhost:3000/api/cron/brief
```

`npm run backfill` also accepts `--queries=policy,subsidy,tech,startups,`
`investment,economy,trade,geopolitics` to crawl only some topics.

## Getting a database (Neon, free tier)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (hostname contains `-pooler`) - this
   matters for serverless (Vercel) so connections don't exhaust the DB's limit.
3. Put it in `.env` as `DATABASE_URL`, then run `npx prisma migrate dev --name init`
   to create the tables.

## Getting a NewsData.io key (optional, free tier)

1. Sign up at [newsdata.io](https://newsdata.io) (free tier: 200 credits/day,
   allows commercial use, has India + business/politics filters).
2. Copy the API key into `.env` as `NEWSDATA_API_KEY`.
3. Ingestion picks it up automatically on the next run - no code changes.

## Getting a Gemini API key (optional, for "The wrap" and "Ask AI")

1. Create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Copy it into `.env` as `GEMINI_API_KEY`.
3. Both features pick it up on the next request - no code changes. `lib/gemini.ts`
   is the shared client (hand-rolled `fetch`, not the SDK - see its file
   comment for why): `/api/cron/brief` makes one call/day to `gemini-3.5-flash`
   (override with `GEMINI_MODEL`) over the day's ~32 headlines; `/api/ask`
   makes one call per question, capped at 1024 output tokens (and is disabled
   unless `NEXT_PUBLIC_ENABLE_ASK="true"`). There's no
   per-user rate limiting on `/api/ask` since the app has no auth layer - fine
   for personal/local use, worth adding a limiter before a public deploy.
   Summarisation failures are logged and swallowed (brief keeps its headline
   list, previous day's wrap stays in place); `/api/ask` failures surface as a
   clear error in the overlay instead.

## Deploying to Vercel

1. Push this repo to GitHub (or another git provider Vercel supports).
2. In Vercel: **New Project** → import the repo.
3. Add environment variables in the Vercel project settings: `DATABASE_URL`
   (and `NEWSDATA_API_KEY` / `GEMINI_API_KEY` if you have them).
4. Generate a random string and set it as `CRON_SECRET` in Vercel's env vars -
   Vercel Cron then automatically sends it as a bearer token on scheduled
   requests, so nobody else can trigger your ingestion/brief routes.
5. Deploy.
6. Run `npx prisma migrate deploy` once against the production `DATABASE_URL`
   (from your machine, with `DATABASE_URL` pointed at prod) to create the
   tables before the first ingestion run.

## The schedule

Ingestion runs **three times a day, at 09:00, 15:00 and 21:00 IST**, from
`.github/workflows/ingest.yml`. It runs `npm run ingest` and then `npm run
brief` on a GitHub runner, talking to the database directly.

It is not a Vercel cron, and `vercel.json` no longer exists. A full sweep is
~95 feeds and takes minutes; a Vercel function is capped at 60 seconds, so the
cron that used to live there was killed part-way through every run and the
archive quietly stopped growing. Vercel's Hobby plan also caps crons at
once/day, which cannot express "three times". A runner has neither limit, needs no
deployment to exist, and is what `scripts/ingest.ts` was written for in the
first place.

To set it up, add three **repository** secrets under Settings → Secrets and
variables → Actions: `DATABASE_URL`, `NEWSDATA_API_KEY`, `GEMINI_API_KEY`.
`CRON_SECRET` is not needed - the runner never goes through HTTP. Then use
Actions → Ingest → **Run workflow** to fire the first run without waiting.

Two things to know about GitHub's scheduler: it queues rather than firing on
the second, so runs land a few minutes late (occasionally 15-20 under load);
and it disables scheduled workflows in a repository with no activity for 60
days, which any commit or manual run re-arms.

To change the times, edit the `cron:` line in the workflow. It is in **UTC**,
so subtract 5:30 from the IST time you want - `30 3,9,15 * * *` is 09:00,
15:00 and 21:00 IST.

## Author

**Vedant Solanki**

- LinkedIn - <https://www.linkedin.com/in/solanki-vedant/>
- Project - <https://github.com/solankivedant/Meridian-Intelligence>

## What's next (Phase 2)

- PRS India (legislative tracker), Startup India schemes feed, DGFT/TRADESTAT
  trade-data scraping, MEA geopolitics - all HTML-scrape-only sources, each
  needs its own bespoke, more fragile scraper.
- Optional LLM-based re-categorization / "why this matters" enrichment.
- Optional Google Trends widget (no reliable free API exists today - `pytrends`
  is unmaintained/rate-limited; SerpApi is a paid alternative).
