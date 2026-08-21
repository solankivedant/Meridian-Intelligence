# Data model

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma). This
document explains the *why*.

## Enums

| Enum | Values | Notes |
| --- | --- | --- |
| `Region` | `INDIA`, `WORLD` | The desk a story belongs to. Both desks share the same categories; only the desk differs. |
| `Category` | `POLICY_REGULATORY`, `SUBSIDY_SCHEME`, `BUSINESS_STARTUP`, `TECH_INNOVATION`, `ECONOMY_MARKETS`, `INVESTMENT_FDI`, `TRADE_IMPORT_EXPORT`, `GEOPOLITICS` | Fixed at eight. Order is mirrored in `lib/categoryMeta.ts` and in the palette. |
| `SourceType` | `RSS`, `API`, `SCRAPE` | `SCRAPE` is reserved; nothing uses it. |

`lib/enums.ts` re-exports these so application code never imports from the
generated Prisma client directly.

## `Source`

One row per publisher. Two populations live here:

- **Configured feeds** (~78) - defined in `lib/ingestion/sources.ts`, upserted
  with their URL and type kept current on every run.
- **Discovered publishers** (~3,400) - created by the archive crawl, which
  attributes each story to the outlet that published it rather than to the
  aggregator. These have a placeholder URL and exist mainly so a story has a
  byline.

`CONFIGURED_SOURCE_NAMES` is what tells the lead-story scorer which of the two a
story came from; a curated feed scores higher.

| Column | Purpose |
| --- | --- |
| `name` | Unique. The dedupe key for publishers. |
| `url`, `type` | Feed endpoint and how to fetch it. |
| `defaultCategory` | Used only when categorisation finds no keyword match. |
| `region` | Which desk the feed belongs to. |
| `active` | Reserved for retiring a feed without deleting its history. |

## `Article`

| Column | Purpose |
| --- | --- |
| `title`, `excerpt` | Headline and a short deck. **Never full text** - see the PRD's legal constraint. |
| `url` | **Unique.** The primary dedupe key; ingestion upserts on it. |
| `category` | Assigned by content, not by feed. |
| `region` | Desk. |
| `tags` | `String[]` of sector keys - 25 curated sub-domains. Empty is legal; the UI falls back to showing the category. |
| `entities` | `String[]` of company keys from `lib/entities.ts` - about 300 curated Indian businesses. Empty is the common case: most stories name nobody in the dictionary. |
| `publishedAt` | The publisher's timestamp. Everything user-facing sorts and groups on this. |
| `fetchedAt` | When we saw it. Useful for diagnosing a stalled crawl. |

### Indexes and what each one serves

| Index | Query it exists for |
| --- | --- |
| `[publishedAt]` | The undifferentiated feed |
| `[category, publishedAt]` | Category pages |
| `[region, publishedAt]` | India / World desk feeds |
| `[region, category, publishedAt]` | A category page narrowed to one desk |
| GIN on `to_tsvector('english', title \|\| ' ' \|\| excerpt)` | Full-text search |
| GIN on `tags` | Sector filters (`tags && ARRAY[...]`) and the sector desk's `unnest` |
| GIN on `entities` | Company pages and the market desk's `unnest` |

The GIN index is created in migration `20260818020834_region_and_search` and is
**not** expressible in the Prisma schema. The expression in `lib/search.ts` must
match it exactly - if the two drift, search still returns correct results but
degrades to a sequential scan over the whole table.

Both array columns carry a GIN index. Sector and company filtering use
`hasSome` / `= ANY(...)`, and the sector and market desks both `unnest` the
arrays across the whole window, which is a sequential scan without one.

### Why companies are stored and issuance is not

`entities` is computed at ingest and stored, because every company page, the
directory and the market desk all ask for it. The issuance and regulator
classifications in `lib/issuance.ts` and `lib/regulator.ts` are computed at
**read** time instead, behind a 15-minute cache: each feeds exactly one page,
and their rule sets will move often while they are young, so storing them would
buy a third and fourth backfill script for no query that needs the index. If
either desk earns its place, promoting it is a migration plus a script and
nothing in the page changes.

## `DailyBrief`

One row per calendar day.

| Column | Shape |
| --- | --- |
| `date` | Unique, `@db.Date`. The IST day the brief covers. |
| `highlights` | `Json` - a few stories per category, keyed by category. The front page interleaves these so one busy category cannot fill the panel. |
| `summary` | `Json?` - Gemini's wrap: `{ overview, points[], model, generatedAt }`. **Nullable**: null whenever summarisation was unconfigured or failed, and the highlight list stands on its own. |
| `generatedAt` | Timestamp shown as "generated 4h ago" in the UI. |

Storing the wrap as JSON rather than columns is deliberate - its shape is owned
by `lib/summarize.ts` and has changed twice without a migration.

## What is deliberately absent

- **No `User`, no auth.** All personalisation (filters, topic desk) is URL
  state. This is why every view is shareable and why saved topics and email
  alerts are blocked (see the PRD's open questions).
- **No `ArticleBody`.** Storing full text would change the project's legal
  posture from aggregator to republisher.
- **No soft deletes.** Nothing is ever removed; retention is an open question.
- **No `updatedAt` on `Article`.** An upsert on `url` refreshes the row in
  place; there is no history of a headline being edited by the publisher.

## Migrations

| Migration | What it added |
| --- | --- |
| `20260817062309_init` | `Source`, `Article`, `DailyBrief`, the category enum |
| `20260818020834_region_and_search` | `Region` on both tables, the region indexes, the GIN search index |
| `20260818090000_brief_summary` | `DailyBrief.summary` |

## Volume (18 August 2026)

~27,994 articles (18,327 India / 9,667 World) across ~3,503 publishers, oldest
story August 2019, growing roughly 500/day.
