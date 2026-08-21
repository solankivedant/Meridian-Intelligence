# Future scope

What to build next, ranked by value against effort. Each item says what it is,
why it matters and what it touches, so any of them can be picked up cold.

Reference: [`docs/prd.md`](docs/prd.md) for what the product is,
[`docs/architecture.md`](docs/architecture.md) for how it fits together.

---

## Where the original wishlist landed

The first pass of this file was a list of UI complaints. All of it shipped:

| Original ask | Status |
| --- | --- |
| Section identification is hard on every page | **Done** - every section is an enclosed panel with an accent cap and a numbered marker |
| Filter section is hard to find | **Done** - framed, tinted panel; period/month/sector now on one row |
| Date should be larger in the header | **Done** - 17–20px, upright instead of italic |
| Sidebar with all sections, opened by an icon | **Done** - `components/Sidebar.tsx` |
| Search should answer in about a second | **Done** - GIN-indexed tsvector, plus typeahead in the masthead |
| Proper section borders, less scrolling | **Done** - panels, day-grouped feed, 40 per page |
| Select multiple sub-domains together | **Done** - multi-select sector chips in `?tags=` |
| More Indian sources + a world page | **Done** - 59 India / 19 World feeds, `/world` |

Everything below is new ground.

---

## Tier 1 - high value, days of work

### 1. A dark-mode toggle
The entire dark palette already exists under `:root[data-theme="dark"]` in
`app/globals.css` and **nothing in the UI ever sets that attribute**. A small
client component in the masthead that writes `data-theme` and remembers the
choice unlocks a finished feature for an afternoon's work.
*Touches:* `app/globals.css` (done), a new toggle component, `app/layout.tsx`.

### 2. Story clustering
The dedupe step throws away the fact that five outlets ran the same story -
which is itself the strongest available signal of importance. Keep the cluster
instead: store a `clusterKey` on `Article`, show "covered by 6 outlets" on the
card, and expand to the list on click.
*Why:* turns a limitation into a ranking signal, and makes the feed noticeably
less repetitive. *Touches:* `lib/ingestion/dedupe.ts`, schema, `ArticleRow`.

### 3. Charts on the pulse
`CategoryPulse` is a bar of counts. The data supports far more: volume over
time per category, sector momentum month on month, which ministries are most
active. Load the `dataviz` skill before writing any of it.
*Touches:* a new chart component, one aggregate query per chart.

### 4. Keyboard navigation
`/` to focus search, `j`/`k` through the feed, `Enter` to open, `g` then a
letter to jump to a desk. The audience is people who read this every morning;
that audience learns shortcuts.
*Touches:* one client component listening at the document level.

### 5. Source health page
`/sources` lists feeds. It should also show, per feed: last successful fetch,
items in the last 7 days, and consecutive failures. Feeds die quietly and
today nothing surfaces that.
*Why:* the single most likely silent failure in the whole system.
*Touches:* an `IngestRun`/`SourceHealth` table, `run.ts`, `/sources`.

### 6. Tests and CI
There is no test framework. The three things most worth pinning are pure
functions and trivial to test: `categorize()`, `pickLeadIndex()` and
`toTsQuery()`. Add Vitest, cover those, add a GitHub Action running
`tsc --noEmit`, `eslint` and the tests.
*Why:* the honest gap in the stack. Categorisation rules are edited often and
nothing currently catches a regression.

### 7. RSS and JSON out
The project consumes feeds and publishes none. `/feed.xml`, `/world/feed.xml`
and one per category costs a single route and makes the dashboard a source for
other people's tools.

---

## Tier 2 - the next real capability

### 8. Accounts, saved topics and email digests
The largest missing capability, and the blocker behind three PRD "should
haves". Today all personalisation is URL state; the topic desk forgets you
between visits and no alert can exist without somewhere to send it.

Smallest version that works: magic-link email auth, a `SavedTopic` table, and a
daily job that runs each saved topic through the existing `lib/topicBrief.ts`
and mails the result. The retrieval and the brief-writing already exist - this
is auth plus a scheduler plus an email provider.
*Decide first:* the PRD deliberately says no accounts. This reverses that.

### 9. Entity pages
Extract ministries, regulators, schemes and companies from headlines and give
each one a page: everything about "PLI", "SEBI" or "GST Council" on one
timeline. Start with a curated dictionary of ~200 entities (the same technique
as the sector tags, which work well), not an NER model.
*Why:* "show me everything about this scheme" is the most obvious question the
current UI cannot answer. *Touches:* `lib/categorize.ts` sibling module,
schema (`entities String[]` + index), a new route.

### 10. Semantic search
Keyword search cannot find "chip factory subsidy" when the story says
"semiconductor fab incentive". Add pgvector, embed title+excerpt at ingest, and
blend vector similarity with the existing `ts_rank`.
*Why:* the topic desk's retrieval quality is capped by exactly this.
*Touches:* a migration, an embedding call in `run.ts`, `lib/search.ts`.

### 11. Deeper primary sources
The feeds cover ministries and the business press. Missing, roughly in order of
value: the e-Gazette, PRS Legislative Research, Parliament questions, sectoral
regulators (TRAI, IRDAI, CCI, DGFT, CBIC), state industrial-policy portals, and
BSE/NSE corporate announcements. Several publish PDFs rather than RSS, which is
its own project (see #15).
*Why:* the difference between "the press reported it" and "the notification
exists".

### 12. Weekly and monthly digests
`/week/2026-W33` and `/month/2026-08` - a written wrap over a longer window,
generated once and stored. The daily wrap already proves the mechanism; a
weekly one is what people forward to colleagues.

---

## Tier 3 - ambitious

### 13. Policy threads
Follow one instrument from consultation paper → draft rules → notification →
amendment as a single timeline. Requires entity extraction (#9) plus a
same-thread classifier. This is the feature that would make the product
genuinely hard to replace.

### 14. Impact scoring
Per sector, rank today's stories by how much they actually matter - a
notification that changes a duty rate over a conference speech. `leadStory.ts`
already scores for prominence; this is the same idea aimed at relevance, and it
needs feedback data to train on, which needs accounts (#8).

### 15. Document intelligence
Ingest gazette notifications and ministry PDFs, extract the operative change,
and let people ask questions against the actual text rather than a headline.
Changes the legal posture (see the PRD's constraint on storing full text) -
decide that before building.

### 16. Multilingual
Hindi and major regional-language sources, and a translated UI. Doubles source
coverage for a large part of the audience. Ingestion is language-agnostic
already; categorisation is not - the keyword rules are English-only.

### 17. A public API
Everything is already a clean read model. `/api/v1/articles` with the existing
filters, key-authenticated, would make this infrastructure for other people's
products.

---

## Tier 4 - the markets layer

The project carries a great deal of *narrative* about markets - roughly twenty
market and finance feeds, an `ECONOMY_MARKETS` section, a `finance-stocks`
sector tag - and not one *number*. Everything below closes that gap, ordered
not by ambition but by how much licensed data it needs, because that is the
only thing that actually gates any of it.

Two standing decisions bound this whole tier. The PRD says the product is not
built for breaking-news trading, and the bottom of this file rules out
real-time data. Neither is being reversed here: the space worth occupying is
**daily-resolution markets as context for policy**, not a terminal.

### Tier 4A - no market data at all

These use the archive that already exists.

#### 18. Company and instrument entity pages
`#9` aimed at listed companies rather than schemes. A curated dictionary of
~500 NSE names with their aliases and tickers ("RIL" / "Reliance Industries" /
`RELIANCE`), matched at ingest alongside `tags`, gives `/company/reliance`:
every policy, regulatory and business story that touched it, on one timeline.
*Why:* it is the join key. Nothing in 4B or 4C is buildable without it.
*Touches:* a `lib/categorize.ts` sibling, schema (`entities String[]` + index),
a new route.

#### 19. Sector to instrument bridge
The 25 sectors in `lib/sectorMeta.ts` map almost one-to-one onto real thematic
and sectoral indices and their ETFs - renewable-energy onto NIFTY Energy,
defence onto NIFTY India Defence, and semiconductors onto nothing, which is
itself worth showing. This is a static mapping table and no data feed
whatsoever, after which `/opportunities` can say "Defence: coverage momentum
+38%, tracked by NIFTY India Defence and 4 ETFs".
*Why:* the cheapest item in the tier by a wide margin, and it is the thing that
makes #24 legible when it lands. *Touches:* one new constant file,
`SectorTable` / `PersonaSectorCard`.

#### 20. Primary issuance desk
Moneycontrol's IPO feed is already ingested, and headlines carry QIP, rights
issue, block deal, buyback and OFS in recognisable language. Parse them into a
status table - filed, open, listed - at `/issuance`.
*Touches:* text extraction next to #18, one route.

#### 21. Regulator action tracker
SEBI's feed is ingested and then flattened into `POLICY_REGULATORY`. Split it:
circular against order against consultation paper, and record who each one
binds (brokers, AMCs, research analysts, issuers). The same shape works for RBI
notifications.
*Why:* this is `#11`'s "the notification exists rather than the press reported
it", applied to the one regulator whose feed is already in hand.

#### 22. Market calendar
MPC dates, the Budget, earnings season, F&O expiry, index rebalances, IPO
windows. Half of it falls out of the archive and half is a static table.
*Touches:* one route, one seed table.

### Tier 4B - needs end-of-day price data

Read "Decide before building any of 4B" below before starting any of these.

#### 23. An `Instrument` / `PriceBar` schema
Daily close only. Indices first: Nifty 50, Bank Nifty, the sectoral indices,
the 10-year G-sec, USD/INR, gold. Individual equities can wait for #18 to prove
the entity dictionary.
*Touches:* a migration, one ingest module, one more GitHub Actions schedule -
the same pattern `run.ts` already uses.

#### 24. Coverage momentum against index return
**The flagship of this tier.** `lib/opportunity.ts` already computes each
sector's *share* of coverage over time. Draw the matching sector index's return
on the same axis and the chart answers a question nothing else answers: policy
attention on defence is up 40% this quarter - had the market already priced it?
*Why:* a two-year India policy archive paired with sector returns is the one
thing here that is genuinely hard to copy. Everything else in this tier is a
data-licensing exercise; this is the product.
*Touches:* #19, #23, a chart in `components/charts`. Load the `dataviz` skill.

#### 25. Policy event studies
Given #18 and #23: take a PLI announcement or a duty change and show the
relevant index at t-1, t, t+5, t+20. Descriptive history, presented as history -
see the regulatory note below.

#### 26. A macro desk
Repo rate, CPI, WPI, IIP, GST collections, GDP, the 10-year yield, forex
reserves, the trade deficit. Every one of these is published by RBI, MoSPI or
PIB, whose feeds are *already ingested* - what is missing is extracting the
number from the release rather than filing the release. `/macro`, with a
sparkline each and "last changed on ___, and here is the story".
*Why:* it needs no exchange licence at all, and it sits closer to the existing
policy remit than anything else in 4B.

#### 27. Rates and bonds desk
`lib/leadStory.ts` currently *penalises* RBI auction results as routine - right
for choosing a lead story, but as structured data those results are the G-sec
curve, state SDL spreads and the issuance calendar, free and daily.

### Tier 4C - needs accounts (`#8`)

#### 28. Policy-exposure screener
Not a price screener. "Rank listed companies by how much subsidy and regulatory
coverage touched their sector over 90 days" inverts the usual instrument: the
screen is on policy flow, not on fundamentals.

#### 29. Watchlist as a filtered policy feed
Paste holdings, get the whole dashboard scoped to those companies and their
sectors, delivered as the existing daily wrap. The retention hook, and the
first thing here anyone would pay for.

#### 30. An ETF and fund lens for the investor desk
`/for/investor` re-ranks stories today; with #19 it can also carry the funds
that track each sector. AMFI publishes NAV data openly.

### Decide before building any of 4B

1. **Licensing.** NSE and BSE price data is licensed even when delayed, and
   scraping their endpoints both breaks constantly and violates their terms.
   The legitimate cheap paths are AMFI NAVs, RBI's DBIE, and World Bank / IMF
   series; Yahoo Finance is unofficial and grey. Settle this before the
   migration in #23, not after.
2. **Positioning.** Anything intraday reverses a stated PRD decision. EOD is
   the line.
3. **Regulatory posture.** Per-instrument scores and anything phrased as a
   "signal" drift towards investment advice, which in India is SEBI
   research-analyst territory. Keep every figure descriptive and historical,
   keep AI-written text labelled as it already is, and carry a disclaimer.

---

## Engineering debt worth paying

| Item | Why it matters |
| --- | --- |
| **No tests** | See #6. Categorisation and lead-scoring regress silently. |
| **No error monitoring** | Failures are `console.error` into Vercel logs. Sentry or equivalent. |
| **No structured ingest logging** | "Did last night's run work, and what did it pull?" cannot be answered without reading logs. |
| **No retention policy** | ~500 rows/day forever, on a free tier. Decide before it decides for you. |
| **Offset pagination** | `skip`/`take` degrades deep in the archive. Cursor pagination on `publishedAt`. |
| **Keyword-only categorisation** | Fast, free and auditable, but blind to paraphrase. Worth measuring accuracy before replacing. |
| **`Article.tags` has no index** | Fine at 28k rows because a date bound always accompanies it. Not fine at 500k. |
| **Ask AI is unmetered** | Any visitor can spend the Gemini quota. Needs a rate limit before real traffic. |

---

## Deliberately not doing

Kept here so they stop being re-proposed: user comments and social features,
real-time/tick data, full-text republishing, paywalled content, and any
editorialising that is not clearly labelled as AI-written.

Derivatives belong on this list too, and are worth spelling out because Tier 4
invites the question. Futures and options are where the breaking-news trading
audience lives, which is precisely the audience the PRD excludes, and the data
is simultaneously the most expensive and the most tightly licensed of anything
discussed above. Expiry dates on the calendar (#22) is the right amount of
derivatives coverage for this product.
