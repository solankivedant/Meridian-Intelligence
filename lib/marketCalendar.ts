import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { Region } from "@/lib/enums";

/**
 * The dates the market year is built around.
 *
 * ## Why this generates rather than stores
 *
 * The obvious way to build a market calendar is a table of dates. It is also
 * the way that rots: a hand-typed list of next year's MPC meetings is wrong
 * the moment the schedule shifts, and - far worse on a page like this - it is
 * wrong *silently and confidently*, because a date in a file carries exactly
 * the same authority whether or not anyone checked it.
 *
 * So this file only emits dates it can **derive from a rule that is written
 * down in law or in the exchange's own framework**: the fiscal year, the
 * quarter ends, the Budget, the statutory advance-tax instalments, the LODR
 * results deadlines. Everything derived that way is correct for any year, in
 * any direction, without maintenance.
 *
 * ## What it deliberately refuses to invent
 *
 * Two things a market calendar is expected to carry are *not* rules:
 *
 *  - **MPC meeting dates.** The cadence is bi-monthly, but the actual dates
 *    are announced annually by the RBI and move. Rather than guess, the desk
 *    reads the archive for when the last one actually happened - see
 *    `getCalendarAnchors` - and says when the next is roughly due.
 *  - **Derivatives expiry.** The expiry weekday is exchange policy and has
 *    been changed more than once in recent years, in different directions on
 *    the two exchanges. It is generated here from a single named constant and
 *    every such event is flagged for verification rather than presented as
 *    settled.
 *
 * Anything carrying `verify` is telling the reader, on the page, that this
 * project cannot confirm the date and where to go to confirm it. That is the
 * honest form for a calendar with no licensed feed behind it, and it is why
 * getting a real exchange calendar sits in Tier 4B of `futurescope.md`.
 */

export type CalendarKind = "fiscal" | "budget" | "tax" | "results" | "expiry" | "policy";

export const CALENDAR_KINDS: { key: CalendarKind; label: string; colorVar: string }[] = [
  { key: "budget", label: "Budget", colorVar: "--cat-economy" },
  { key: "policy", label: "Monetary policy", colorVar: "--cat-policy" },
  { key: "results", label: "Results", colorVar: "--cat-business" },
  { key: "fiscal", label: "Fiscal year", colorVar: "--cat-trade" },
  { key: "tax", label: "Tax & filing", colorVar: "--cat-subsidy" },
  { key: "expiry", label: "Derivatives", colorVar: "--cat-investment" },
];

const KIND_META = new Map(CALENDAR_KINDS.map((kind) => [kind.key, kind]));

export function calendarKindMeta(kind: CalendarKind) {
  return KIND_META.get(kind) ?? CALENDAR_KINDS[0];
}

export type CalendarEvent = {
  /** Stable across regenerations, so React keys and links do not churn. */
  key: string;
  date: Date;
  title: string;
  detail: string;
  kind: CalendarKind;
  /**
   * Where the date came from. `rule` is derivable from statute or a published
   * framework; `convention` is what has happened every year but binds nobody.
   */
  basis: "rule" | "convention";
  /** Set when this project cannot confirm the date. Rendered as a caveat. */
  verify?: string;
};

/**
 * The weekday monthly index derivatives are taken to expire on, 0 = Sunday.
 *
 * **This is exchange policy, not a law of nature.** NSE and BSE have each
 * moved their expiry day more than once, and to different days from one
 * another. It is a single constant so that correcting it is a one-line change,
 * and every event it produces is flagged with `verify` so that no reader takes
 * a generated date as confirmed. Do not remove that flag without a licensed
 * calendar feed behind it.
 */
const MONTHLY_EXPIRY_WEEKDAY = 4; // Thursday

/**
 * Days after a quarter ends by which a listed company must file results.
 *
 * SEBI's listing regulations give 45 days for the first three quarters and 60
 * for the annual audited results, which is why the March quarter is generated
 * separately below. These are the deadlines, not the season - most large
 * companies report well inside them - so the event is worded as the last day
 * rather than as "results week".
 */
const RESULTS_DEADLINE_DAYS = 45;
const ANNUAL_RESULTS_DEADLINE_DAYS = 60;

/** Midnight IST for a calendar day, expressed as the instant to format from. */
function istDate(year: number, month: number, day: number): Date {
  // 00:00 UTC renders as 05:30 on the same date in IST, which is what every
  // formatter in `lib/formatTime.ts` will show. Building the date in local
  // server time instead would put a Vercel box in another zone a day out.
  return new Date(Date.UTC(year, month, day));
}

/** The nth-from-last occurrence of a weekday in a month. */
function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const shift = (last.getUTCDay() - weekday + 7) % 7;
  return istDate(year, month, last.getUTCDate() - shift);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Every rule-derived event between two dates.
 *
 * Generated per calendar year touched by the range and then filtered, which is
 * simpler than reasoning about partial years and costs nothing at this size.
 */
export function calendarEvents(from: Date, to: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const firstYear = from.getUTCFullYear();
  const lastYear = to.getUTCFullYear();

  for (let year = firstYear - 1; year <= lastYear + 1; year++) {
    // ---- Annual anchors -------------------------------------------------
    events.push({
      key: `budget-${year}`,
      date: istDate(year, 1, 1),
      title: `Union Budget ${year}-${String((year + 1) % 100).padStart(2, "0")}`,
      detail:
        "Presented to Parliament on 1 February. The single largest policy event of the Indian year, and the one this archive's coverage skews hardest around.",
      kind: "budget",
      basis: "convention",
      verify: "The 1 February date has held every year since 2017 but is set by the government, not by statute.",
    });
    events.push({
      key: `survey-${year}`,
      date: istDate(year, 0, 31),
      title: `Economic Survey ${year - 1}-${String(year % 100).padStart(2, "0")}`,
      detail: "The Finance Ministry's review of the year, tabled the day before the Budget.",
      kind: "budget",
      basis: "convention",
      verify: "Tabled the day before the Budget by convention; confirm against the Ministry's announcement.",
    });
    events.push({
      key: `fy-end-${year}`,
      date: istDate(year, 2, 31),
      title: `Financial year ${year - 1}-${String(year % 100).padStart(2, "0")} ends`,
      detail:
        "The Indian fiscal year runs April to March. Everything measured 'for the year' in this archive - GDP, collections, exports - is measured to this date.",
      kind: "fiscal",
      basis: "rule",
    });
    events.push({
      key: `fy-start-${year}`,
      date: istDate(year, 3, 1),
      title: `Financial year ${year}-${String((year + 1) % 100).padStart(2, "0")} begins`,
      detail: "New rates, thresholds and schemes announced in the Budget generally take effect today.",
      kind: "fiscal",
      basis: "rule",
    });

    // ---- Statutory tax dates --------------------------------------------
    const advance: { month: number; day: number; share: string }[] = [
      { month: 5, day: 15, share: "15% of the year's estimated liability" },
      { month: 8, day: 15, share: "45% cumulative" },
      { month: 11, day: 15, share: "75% cumulative" },
      { month: 2, day: 15, share: "100% cumulative" },
    ];
    for (const instalment of advance) {
      events.push({
        key: `advance-tax-${year}-${instalment.month}`,
        date: istDate(year, instalment.month, instalment.day),
        title: "Advance tax instalment",
        detail: `Corporate and individual advance tax due - ${instalment.share}.`,
        kind: "tax",
        basis: "rule",
      });
    }

    // ---- Quarter ends, and the results deadlines that follow them -------
    const quarters = [
      { month: 5, day: 30, label: "Q1" },
      { month: 8, day: 30, label: "Q2" },
      { month: 11, day: 31, label: "Q3" },
      { month: 2, day: 31, label: "Q4" },
    ];
    for (const quarter of quarters) {
      const end = istDate(year, quarter.month, quarter.day);
      const annual = quarter.label === "Q4";
      events.push({
        key: `quarter-${year}-${quarter.label}`,
        date: end,
        title: `${quarter.label} FY${String((quarter.month === 2 ? year : year + 1) % 100).padStart(2, "0")} ends`,
        detail: annual
          ? "The financial year closes. Audited annual results follow."
          : "Quarter closes; listed companies begin reporting shortly after.",
        kind: "fiscal",
        basis: "rule",
      });
      events.push({
        key: `results-${year}-${quarter.label}`,
        date: addDays(end, annual ? ANNUAL_RESULTS_DEADLINE_DAYS : RESULTS_DEADLINE_DAYS),
        title: `${quarter.label} results deadline`,
        detail: annual
          ? "Last day for listed companies to file audited annual results, 60 days after the year end."
          : `Last day for listed companies to file ${quarter.label} results, ${RESULTS_DEADLINE_DAYS} days after the quarter end.`,
        kind: "results",
        basis: "rule",
        verify: "Deadline set by SEBI's listing regulations; extensions are occasionally granted.",
      });
    }

    // ---- Monthly: GST filing and derivatives expiry ----------------------
    for (let month = 0; month < 12; month++) {
      events.push({
        key: `gst-${year}-${month}`,
        date: istDate(year, month, 20),
        title: "GST returns due",
        detail:
          "GSTR-3B and the month's tax payment. Monthly collections are published in the first days of the following month and are one of the archive's most-covered indicators.",
        kind: "tax",
        basis: "rule",
        verify: "The 20th applies to monthly filers; QRMP taxpayers and some states follow a different date.",
      });
      events.push({
        key: `expiry-${year}-${month}`,
        date: lastWeekdayOfMonth(year, month, MONTHLY_EXPIRY_WEEKDAY),
        title: "Monthly derivatives expiry",
        detail:
          "Monthly index and stock futures and options settle. Volume and volatility both cluster here, which is why coverage does too.",
        kind: "expiry",
        basis: "convention",
        verify:
          "Generated from a single constant in lib/marketCalendar.ts. Both exchanges have changed their expiry day in recent years - confirm with NSE or BSE before relying on it.",
      });
    }
  }

  return events
    .filter((event) => event.date >= from && event.date <= to)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** `publishedAt` is epoch milliseconds - see the note in `lib/issuance.ts`. */
export type CalendarAnchor = {
  title: string;
  url: string;
  publishedAt: number;
  sourceName: string;
};

export type CalendarAnchors = {
  /** Most recent story that reads as an MPC decision, if any. */
  lastPolicy: CalendarAnchor | null;
  /** Most recent Budget-day coverage, for the same purpose. */
  lastBudget: CalendarAnchor | null;
};

/**
 * The two dates the archive knows better than any rule could.
 *
 * The MPC meets bi-monthly on dates the RBI announces a year at a time, so no
 * rule generates them - but the archive holds every one of them as coverage,
 * and "the last decision was on this date" plus a known cadence is both true
 * and more useful than a guessed future date. This is the pattern to reach for
 * whenever a calendar entry is a schedule rather than a rule.
 */
export const getCalendarAnchors = unstable_cache(
  async (region: Region): Promise<CalendarAnchors> => {
    const [policy, budget] = await Promise.all([
      db.article.findFirst({
        where: {
          region,
          OR: [
            { title: { contains: "monetary policy", mode: "insensitive" } },
            { title: { contains: "repo rate", mode: "insensitive" } },
            { title: { contains: "MPC", mode: "insensitive" } },
          ],
        },
        orderBy: { publishedAt: "desc" },
        include: { source: true },
      }),
      db.article.findFirst({
        where: {
          region,
          OR: [
            { title: { contains: "union budget", mode: "insensitive" } },
            { title: { contains: "budget 20", mode: "insensitive" } },
          ],
        },
        orderBy: { publishedAt: "desc" },
        include: { source: true },
      }),
    ]);

    const shape = (row: typeof policy) =>
      row
        ? {
            title: row.title,
            url: row.url,
            publishedAt: row.publishedAt.getTime(),
            sourceName: row.source.name,
          }
        : null;

    return { lastPolicy: shape(policy), lastBudget: shape(budget) };
  },
  ["calendar-anchors"],
  { revalidate: 900 }
);

/** Whole days from today to `date`, negative in the past. IST-aligned. */
export function daysAway(date: Date): number {
  const day = 24 * 60 * 60 * 1000;
  const today = Math.floor(Date.now() / day);
  return Math.floor(date.getTime() / day) - today;
}

/** "in 3 days" / "tomorrow" / "6 days ago" - the calendar's own relative label. */
export function relativeDay(date: Date): string {
  const days = daysAway(date);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return days < 14 ? `in ${days} days` : `in ${Math.round(days / 7)} weeks`;
  const past = Math.abs(days);
  return past < 14 ? `${past} days ago` : `${Math.round(past / 7)} weeks ago`;
}
