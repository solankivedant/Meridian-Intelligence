# Project documentation

Reference set for the India Policy & Business Dashboard. The root
[`README.md`](../README.md) is the *setup* guide - install, keys, deploy. These
documents are the *reasoning*: what the product is for, how it is built, and why
it is built that way.

| Document | Answers |
| --- | --- |
| [prd.md](prd.md) | Who it is for, what problem it solves, what counts as done |
| [architecture.md](architecture.md) | How a story travels from a publisher to the page |
| [data-model.md](data-model.md) | Every table, column, index, and why it exists |
| [tech-stack.md](tech-stack.md) | Every dependency and the trade-off behind it |
| [design.md](design.md) | The editorial design language and its rules |
| [operations.md](operations.md) | Running it: env vars, crons, costs, failure modes |
| [../futurescope.md](../futurescope.md) | What to build next, ranked |

## The project in one paragraph

Indian policy news is scattered across ministry press-release pages, regulator
notification feeds and a dozen business dailies, and none of it is organised the
way someone tracking a sector needs it. This dashboard ingests ~78 RSS feeds on
a schedule, uses a manual dated news-archive crawl, sorts every story into one
of eight categories and 25 cross-cutting sector tags, and renders it as a publication -
a feed grouped by day, a scored lead story, an AI-written daily wrap, and a
searchable archive that currently holds ~28,000 stories going back to 2019.

## Current state (18 August 2026)

| | |
| --- | --- |
| Stories in archive | ~27,994 (18,327 India / 9,667 World) |
| Oldest story | August 2019 |
| Configured feeds | 59 India + 19 World, plus an optional NewsData.io key |
| Distinct publishers seen | ~3,500 (feeds plus archive-discovered) |
| Categories / sector tags | 8 / 25 |
| Deployment | Vercel + Neon Postgres, two daily crons |

## Conventions used across these docs

- **Desk** - India or World. Both share the same eight categories.
- **Category** - one of the eight top-level sections a story is filed under.
- **Sector tag** - a cross-cutting sub-domain (semiconductors, fintech, MSME…).
  A story has one category and zero or more sector tags.
- **The lead** - the one story a page opens on, chosen by score, not recency.
- **The wrap** - the AI-written summary of the last 24 hours.
