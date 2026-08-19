# Product requirements

## 1. The problem

Anyone whose work depends on Indian policy - a founder waiting on a PLI
notification, an analyst tracking RBI circulars, a consultant briefing clients on
trade rules - currently reconstructs the same picture by hand every morning:

- **Primary sources are unreadable as feeds.** PIB, RBI, SEBI and PM India all
  publish RSS, but as an undifferentiated stream of numbered circulars, auction
  results and enforcement orders. Signal and procedure look identical.
- **Coverage is fragmented.** The same PLI decision appears across Economic
  Times, Mint, Business Standard and BusinessLine under four headlines and four
  URLs. Following all four means reading everything four times.
- **Nothing is organised by sector.** "What happened in semiconductors this
  month" is not a query any of these sources can answer.
- **History is inaccessible.** RSS exposes a publisher's latest few dozen items.
  Three months ago is effectively gone unless you paid for a terminal.

General news aggregators do not solve this: they optimise for breaking news
across all topics, not for the eight specific things this audience tracks, and
they have no notion of a sector or a policy instrument.

## 2. Who it is for

| User | What they need | What they do here |
| --- | --- | --- |
| **Founder / operator** (primary) | To know when a scheme, subsidy or regulation touches their sector | Filters to their sector, reads the wrap, opens two or three sources |
| **Analyst / consultant** | A defensible record of what happened and when | Searches the archive, browses by month, cites the source link |
| **Policy researcher** | Longitudinal coverage of an instrument or ministry | Month picker + sector filter, back to 2019 |
| **Investor** | Sector momentum and where state money is going | The pulse, investment and subsidy categories |

Not built for: general news readers, breaking-news trading, or anyone needing
full article text (see §6).

## 3. What it does

### 3.1 Ingest
- Pull ~78 configured RSS feeds across two desks on a schedule.
- Crawl a dated news archive month by month for deep history (16 topical
  queries × N months), attributing each story to its real publisher.
- Optionally pull NewsData.io when a key is present.
- Deduplicate on URL *and* on normalised headline, so one wire story
  republished by five outlets stores once.

### 3.2 Organise
- File every story into exactly one of eight categories by keyword rules, not
  by which feed it arrived on - a policy story from a markets feed is still
  policy.
- Attach zero or more of 25 sector tags.
- Assign a desk (India / World).

### 3.3 Present
- A front page that opens on the newest stories, then a scored lead, an
  AI-written wrap of the last 24 hours, and a volume breakdown.
- A feed grouped by IST day, each day opening with a feature.
- Eight category pages, a World desk, a sources page, a personal topic desk.
- Full-text search with typeahead over every stored headline and excerpt.
- Filters - period, month, sector - combinable and shareable as a URL.

### 3.4 Interpret
- **The wrap**: one Gemini call per day writes a standfirst plus 3–5
  category-tagged takeaways over the day's headlines.
- **Ask AI**: per-article Q&A against that story's headline, excerpt and
  metadata.
- **Your desk**: a free-text topic ("EV battery manufacturing") retrieves
  matching stories and has Gemini write a brief over them.

## 4. Requirements

### Must have (all shipped)
- R1 Ingest from official + business-press sources on a schedule, unattended.
- R2 Categorise every story into 8 categories independent of source.
- R3 Deduplicate republished wire copy.
- R4 Filter by period, month and multiple sectors, shareable by URL.
- R5 Search the whole archive in well under a second.
- R6 Never store full article text; always link back to the publisher.
- R7 Degrade to a useful page when the DB, an AI key or a feed is unavailable.
- R8 Deep history - at least two years, not just the RSS window.

### Should have
- S1 An AI daily wrap that is skippable, not load-bearing. - shipped
- S2 A World desk tracked alongside India. - shipped
- S3 Per-article Q&A. - shipped
- S4 A user-defined topic desk. - shipped
- S5 Email or push delivery of the wrap. - **not built**
- S6 Saved topics that persist across visits. - **not built** (topic desk is
  URL state only; there are no user accounts)

### Won't have (deliberate)
- No user accounts, comments or social features.
- No full article text, no paywalled content, no scraping behind a login.
- No real-time/tick data. Daily is the correct cadence for policy.
- No editorialising beyond clearly-labelled AI summaries.

## 5. Success criteria

| | Target | Where measured |
| --- | --- | --- |
| Front page renders | < 1.5s server time with a warm DB | Dev/prod logs |
| Search | < 1s to first result | GIN index on the tsvector |
| Coverage | Every configured feed represented in the last 24h | `/sources` page, coverage strip |
| Freshness | Nothing on the front page older than the selected range | Feed query |
| Correctness | A story's category matches its content, not its feed | Spot-check |
| Resilience | Page still renders with the DB down | `lib/safeQuery.ts` |

## 6. Constraints

- **Legal.** Headline, short excerpt, link. Never the full text. This keeps the
  project an aggregator rather than a republisher, and is why the excerpt column
  is fed from feed descriptions only.
- **Free tier.** Neon free Postgres, Vercel Hobby (one cron run per day per
  path), NewsData.io free tier, Gemini free tier. Every design decision that
  looks conservative about API calls traces back to this.
- **Serverless timeouts.** Anything longer than ~60s must run as a local script
  (`npm run backfill`) rather than in a route.
- **No client-side state store.** Filters live in the URL. This is a feature -
  every view is linkable - and it removes a whole class of bugs.

## 7. Open questions

1. Should sector tags be model-assigned rather than keyword-assigned? Keywords
   are fast, free and auditable, but miss paraphrase.
2. Is a daily cadence right for the wrap, or should it be per-desk?
3. What is the retention policy? The archive grows ~500 stories/day; nothing is
   ever deleted today.
4. Without accounts, how does a saved topic or an alert work? (Blocks S5/S6.)
