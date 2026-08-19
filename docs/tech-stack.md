# Tech stack

Every dependency, what it does here, and the trade-off behind it.

## Runtime and framework

| | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16.3 (App Router, Turbopack)** | Server Components mean the feed is queried and rendered on the server with no client data-fetching layer, no loading spinners and no API surface to maintain for the pages themselves. |
| UI | **React 19.2** | Comes with the framework. Used almost entirely as server components; four components are client-side (see below). |
| Language | **TypeScript 5** (strict) | Category and region are enums that flow from the schema through queries into the UI - the compiler is what stops a desk or a category being mistyped in one of eight places. |
| Node | **24.x** | Whatever Vercel runs. |

> ⚠️ This project runs a Next.js version with breaking changes from what most
> references describe. Read the relevant guide in `node_modules/next/dist/docs/`
> before writing routing, params or config code. See [`AGENTS.md`](../AGENTS.md).

### Notable framework specifics in use
- `searchParams` and `params` are **Promises** and must be awaited.
- `export const revalidate = 0` on every data page - this is a dashboard;
  caching a feed is never right.
- `export const maxDuration = 60` on `/my-desk`, because the Gemini call is
  allowed two 30s attempts and the platform default of 10s would kill it.
- `LayoutProps<"/">` typing for the root layout.

## Data

| | Choice | Why |
| --- | --- | --- |
| Database | **Postgres (Neon, free tier)** | Full-text search, array columns for tags and JSON for the brief - all three in one engine, none of which SQLite or a document store gives at once. |
| ORM | **Prisma 7.9** with `@prisma/adapter-pg` | Type-safe queries generated from the schema. The driver adapter is what lets the same client work in serverless and in `tsx` scripts. |
| Driver | **pg 8.23** | Under the adapter. Its `sslmode` handling is pinned in `lib/db.ts` - see below. |

Two deliberate escapes from the ORM:
- **Full-text search** (`lib/search.ts`) is raw SQL, because Prisma cannot reach
  `tsvector` operators.
- **The GIN index** lives in a hand-written migration for the same reason.

### Connection notes
- Use the **pooled** Neon connection string (hostname contains `-pooler`) in
  serverless, or connections exhaust the database limit.
- `lib/db.ts` rewrites `sslmode=require|prefer|verify-ca` to `verify-full`.
  `pg` currently treats those as aliases for `verify-full` and warns that pg 9
  will give them libpq's weaker semantics instead; pinning the mode keeps
  today's behaviour and stops the certificate check disappearing on upgrade.
- The client is cached on `globalThis` outside production so HMR does not open
  a new pool per edit.

## Styling

| | Choice | Why |
| --- | --- | --- |
| CSS | **Tailwind CSS 4** via `@tailwindcss/postcss` | Utility classes for layout and spacing. |
| Design tokens | **CSS custom properties** in `app/globals.css` | Colour never appears as a Tailwind class. Every hue is a `var(--cat-*)` or `var(--text-*)`, which is what lets one `[data-theme="dark"]` block re-skin the whole app and what makes the eight-category palette a single source of truth. |
| Fonts | **Newsreader** (serif headlines), **Geist Sans** (UI), **Geist Mono** (metadata) | Newsreader is an optical-size variable serif, so one family covers a 40px lead and a 15px row headline without a second webfont. |
| Icons | **lucide-react 1.31** | Consistent 1.5px stroke at every size used. |

See [design.md](design.md) for the rules these tokens serve.

## Ingestion

| | Choice | Why |
| --- | --- | --- |
| RSS | **rss-parser 3.13** | Handles the malformed XML that Indian government feeds routinely emit. |
| Archive crawl | Hand-rolled `fetch` over dated news-archive queries | No dependency does this; the `after:`/`before:` operator pattern is the whole trick. |
| NewsData.io | Hand-rolled `fetch` | One endpoint; a client library would be more code than the call. |
| Scripts | **tsx 4.23** | Runs the TypeScript ingestion scripts directly, sharing `lib/` with the app instead of duplicating it. |
| Env | **dotenv 17** | Only for the scripts - Next loads `.env` itself. |

## AI

**Google Gemini** (`gemini-3.5-flash`, override with `GEMINI_MODEL`), called
through a hand-rolled `fetch` client in `lib/gemini.ts` rather than the SDK -
the file comment explains why. Three consumers, all of which fail soft when the
key is absent: the daily wrap, per-article Ask, and the topic desk.

Chosen for the free tier and for latency on a summarisation task where the
input is ~32 headlines. Nothing about the integration is provider-specific
beyond that one file.

## Client-side JavaScript

Deliberately four components. Everything else is server-rendered.

| Component | Why it must be a client component |
| --- | --- |
| `SearchBox` | Debounced typeahead, keyboard navigation, outside-click dismissal |
| `SectionJump` | Reads which sections exist from the DOM, scroll-spies the active one |
| `PrimaryNav` | Needs `usePathname` to mark the current page |
| `Sidebar`, `AskArticleButton`, `TopicForm` | Drawer state, overlay state, form state |

Filters, pagination and sector selection are **links**, not state. Combinations
stay shareable, bookmarkable and work with JavaScript off.

> One trap worth knowing: importing anything from `lib/search.ts` into a client
> component drags Prisma and `pg` into the browser bundle and breaks the build.
> That is why `MAX_QUERY_LENGTH` lives alone in `lib/searchLimits.ts`.

## Hosting

| | Choice |
| --- | --- |
| App | **Vercel** - the crons in `vercel.json` are the scheduler |
| Database | **Neon** - pooled connection string |
| Build | `prisma generate && next build` (also `postinstall`, so Vercel's cache never serves a stale client) |

Vercel Hobby allows one cron run per day per path, which is why ingestion is
daily and backfill remains a manual local script.

## Tooling

- **ESLint 9** with `eslint-config-next`. Note the `react-hooks` rules are
  strict here: `set-state-in-effect` will reject a `setState` called
  synchronously in an effect body, which is why `SearchBox` derives its visible
  suggestions from stored state and `SectionJump` reads the DOM in a
  `requestAnimationFrame`.
- **`npx tsc --noEmit`** for typechecking.
- No test framework yet - the honest gap in this stack. See
  [futurescope.md](../futurescope.md).
