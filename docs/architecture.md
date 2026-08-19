# Architecture

## The shape of it

Two independent halves that meet at one Postgres database:

```
  INGESTION (scheduled, write-only)          READING (on request, read-only)
  ─────────────────────────────────          ──────────────────────────────
  RSS feeds ──┐                                     ┌── / (India desk)
  Archive ────┼─► normalise ─► categorise ─┐        ├── /world
  NewsData ───┘       │                    │        ├── /category/[slug]
                      └─ dedupe ───────────┤        ├── /search
                                           ▼        ├── /my-desk
                                     ┌──────────┐   ├── /sources
                                     │ Postgres │◄──┤
                                     └──────────┘   └── /api/suggest
                                           ▲
                                     ┌─────┴─────┐
                                     │  Gemini   │  (wrap, ask, topic brief)
                                     └───────────┘
```

Nothing in the reading half writes. Nothing in the ingestion half renders. The
only coupling is the schema and `lib/categorize.ts`.

## Ingestion

`lib/ingestion/run.ts` orchestrates three source types behind one interface
(`types.ts` → `RawArticle`).

| Module | Source | Notes |
| --- | --- | --- |
| `rss.ts` | 59 India + 19 World feeds in `sources.ts` | Every feed was fetch-tested; broken ones are documented as absent, not silently dropped |
| `googleNews.ts` | Dated news-archive queries | 16 topical queries (8 per desk) with `after:`/`before:` operators |
| `newsdata.ts` | NewsData.io API | Only runs when `NEWSDATA_API_KEY` is set |

### The pipeline, per article

1. **Fetch** - feed or query returns raw items.
2. **Normalise** (`util.ts`) - strip HTML from descriptions, resolve the real
   publisher (the archive returns aggregator URLs), parse dates.
3. **Categorise** (`lib/categorize.ts`) - keyword rules assign one of eight
   categories plus any of 25 sector tags. Runs on title + excerpt, so a feed's
   `defaultCategory` only applies when nothing matches. Feeds marked `strict`
   are dropped entirely when nothing matches, which is how a general-interest
   feed avoids dumping sport into policy.
4. **Deduplicate** (`dedupe.ts`) - `url` is unique in the schema, and a
   normalised headline key is compared against everything already stored in the
   window being processed. Five outlets carrying one PTI story yield one row.
5. **Store** - upsert on `url`.

### Two things that were learned the hard way

Both are load-bearing and documented in `run.ts` itself:

- **`SourceCache`** - the archive crawl discovers hundreds of publishers. An
  upsert per publisher name exhausted the connection pool and got the server to
  hang up mid-crawl. Unknown publishers are now resolved with one `createMany`
  plus one `findMany` per batch.
- **`withRetry`** - hosted Postgres drops pooled connections under a long
  crawl. Losing an hour of progress to one closed socket is not an acceptable
  failure mode for a batch job, so DB calls retry with backoff.

### Entry points

| Entry point | Cadence | Scope |
| --- | --- | --- |
| `npm run ingest` | Manual | Everything |
| `npm run backfill -- --months=23` | Manual | Deep history; minutes, not seconds |
| `/api/cron/ingest` | Daily 00:00 UTC | Everything |
| `/api/cron/brief` | Daily 01:30 UTC | Builds the day's `DailyBrief` + wrap |

The two scheduled routes are protected by `CRON_SECRET` (`lib/cron-auth.ts`).
Backfill is manual because real history belongs in the local script rather than
a serverless function.

## Reading

Every page is a React Server Component with `revalidate = 0`. Data is fetched in
one `Promise.all` per page, each call wrapped in `safeQuery` so a database
failure degrades to an empty state rather than a 500.

### Shared query layer

`lib/feedQuery.ts` is the single definition of what a feed page asks for:

- `parseFeedParams` - URL → typed filters, tolerating the legacy singular `tag`.
- `buildFeedWhere` - filters + desk/category scope → a Prisma `where`.
- `feedSlice` - which rows to fetch. The unfiltered first page lifts one story
  into the lead panel, so it takes `PAGE_SIZE + 1` and later pages skip that
  extra row; without this the grid silently showed 39 of 40.
- `isNarrowed` - has the reader filtered? Drives whether the editorial panels
  (wrap, lead, pulse) appear at all.

Three pages (`/`, `/world`, `/category/[slug]`) share all four, which is what
keeps the archive behaving identically everywhere.

### Page composition

The front page renders, in order: the coverage strip, **the feed** (`01 Latest
stories`), the wrap, the lead, the pulse. The feed leads because a reader
arriving mid-morning wants what has landed since they last looked; the editorial
panels follow, reachable in one click from the masthead's jump links.

`components/Section.tsx` frames every one of these as a bordered panel with an
accent cap. `components/ArticleRow.tsx` renders the same record in four
registers - `lead`, `feature`, `card`, `row` - and mixing registers is what
gives a long page a reading order.

### Search

`lib/search.ts` drops to raw SQL because Prisma cannot reach Postgres' tsvector
operators. The match expression must stay byte-identical to the GIN index
created in `20260818020834_region_and_search`, or every search silently becomes
a sequential scan over tens of thousands of rows.

Terms get a `:*` prefix wildcard so partial words match while typing. Input is
reduced to alphanumerics first - `to_tsquery` throws on stray operators, and a
thrown query is a 500. Results rank by `ts_rank`, then recency.

`/api/suggest` runs the same query with `take: 6` to feed the masthead
typeahead, so the dropdown and the results page can never disagree.

### AI

`lib/gemini.ts` is a hand-rolled `fetch` client (not the SDK - see its file
comment). Three consumers, each of which fails soft:

| Feature | Call volume | Without a key |
| --- | --- | --- |
| The wrap (`lib/summarize.ts`) | 1/day over ~32 headlines | Brief still generates, no written summary |
| Ask AI (`/api/ask`) | 1 per user question | Overlay shows "not configured" |
| Your desk (`lib/topicBrief.ts`) | 1 per topic submission | Stories still retrieve, no brief |

The model is `gemini-3.5-flash`, overridable with `GEMINI_MODEL`.

## Failure behaviour

| Failure | Result |
| --- | --- |
| Database unreachable | Every page renders with empty states (`safeQuery`) |
| One feed 404s | Logged, the run continues; `/sources` shows it as quiet |
| Gemini key missing/failing | AI panels absent or explicitly "not configured" |
| Suggest endpoint fails | Masthead search behaves as a plain search box |
| Cron missed | Next run catches up; ingestion is idempotent on `url` |
