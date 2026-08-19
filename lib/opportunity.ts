import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { Category, Region } from "@/lib/enums";
import { TAG_META } from "@/lib/categorize";

/**
 * What the archive itself can say about a sector.
 *
 * Everything in this module is *measured*, not asserted: it counts what India's
 * ministries, regulators and newsrooms have actually published against each of
 * the 25 sector tags, month by month. That is a real signal and a narrow one -
 * coverage volume is attention, not revenue, and a sector can be loud because
 * it is in trouble. The numbers here are labelled as coverage throughout, and
 * the market-side figures a reader wants next (market size, sector CAGR,
 * valuation ratios) come from a separate, clearly-attributed model pass in
 * `lib/sectorBrief.ts`. Keeping the two apart is the whole point: one is
 * arithmetic on our own rows, the other is an estimate.
 */

/** The window every signal is computed over. The archive holds ~24 months. */
export const WINDOW_MONTHS = 24;

/** Momentum compares the last quarter against the one before it. */
const MOMENTUM_DAYS = 90;

/**
 * A quarter needs at least this many stories behind it before a rate of change
 * means anything. Two stories becoming twelve is not a 500% acceleration, it is
 * two stories - and without a floor those rows own the top of the table.
 */
const MIN_MOMENTUM_BASE = 12;

export type MonthPoint = { month: string; count: number };

export type SectorSignal = {
  key: string;
  label: string;
  /** Stories tagged to this sector inside the window. */
  total: number;
  /** Oldest month first, gaps filled with zero so the series is continuous. */
  monthly: MonthPoint[];
  /** The same months as a share of all coverage - what the rates are built on. */
  monthlyShare: MonthPoint[];
  /** Stories in the last 90 days. */
  recent: number;
  /** Stories in the 90 days before those. */
  previous: number;
  /**
   * Change in this sector's *share* of all coverage, last quarter against the
   * one before. Null when the prior quarter is too thin to rate.
   */
  momentum: number | null;
  /** Year-on-year change in share of coverage. Null without two full years. */
  yoy: number | null;
  /** Compound annual growth of this sector's share of coverage. */
  cagr: number | null;
  /** This sector's share of all coverage in the window. */
  share: number;
  byCategory: { category: Category; count: number }[];
  /** Share of coverage that is policy or subsidy news - how state-driven it is. */
  policyShare: number;
  /** Share that is investment/FDI news - how much money is visibly moving. */
  capitalShare: number;
  /** Most recent story date, epoch ms. */
  latestAt: number | null;
};

type MonthRow = { tag: string; month: string; count: number };
type BaselineRow = { month: string; count: number };
type BaselineWindowRow = { recent: number; previous: number };
type CategoryRow = { tag: string; category: Category; count: number };
type WindowRow = { tag: string; recent: number; previous: number; latest: Date | null };

/**
 * One pass over the archive for all 25 sectors.
 *
 * A per-sector query would be 75 round trips for a page that shows a table.
 * Instead each shape of the data is fetched once, unnesting the `tags` array
 * so a story counts towards every sector it carries, and the per-sector rollup
 * happens in memory. The whole thing is cached: it scans tens of thousands of
 * rows, it is identical for every reader, and it changes only as fast as
 * ingestion runs.
 */
async function computeSignals(region: Region): Promise<SectorSignal[]> {
  const [months, categories, windows, baseline, baselineWindows] = await Promise.all([
    db.$queryRaw<MonthRow[]>`
      SELECT t.tag AS "tag",
             to_char(date_trunc('month', a."publishedAt"), 'YYYY-MM') AS "month",
             COUNT(*)::int AS "count"
      FROM "Article" a
      CROSS JOIN LATERAL unnest(a."tags") AS t(tag)
      WHERE a."region" = ${region}::"Region"
        AND a."publishedAt" >= now() - (${WINDOW_MONTHS} || ' months')::interval
      GROUP BY 1, 2
    `,
    db.$queryRaw<CategoryRow[]>`
      SELECT t.tag AS "tag", a."category" AS "category", COUNT(*)::int AS "count"
      FROM "Article" a
      CROSS JOIN LATERAL unnest(a."tags") AS t(tag)
      WHERE a."region" = ${region}::"Region"
        AND a."publishedAt" >= now() - (${WINDOW_MONTHS} || ' months')::interval
      GROUP BY 1, 2
    `,
    db.$queryRaw<WindowRow[]>`
      SELECT t.tag AS "tag",
             COUNT(*) FILTER (
               WHERE a."publishedAt" >= now() - (${MOMENTUM_DAYS} || ' days')::interval
             )::int AS "recent",
             COUNT(*) FILTER (
               WHERE a."publishedAt" <  now() - (${MOMENTUM_DAYS} || ' days')::interval
                 AND a."publishedAt" >= now() - (${MOMENTUM_DAYS * 2} || ' days')::interval
             )::int AS "previous",
             MAX(a."publishedAt") AS "latest"
      FROM "Article" a
      CROSS JOIN LATERAL unnest(a."tags") AS t(tag)
      WHERE a."region" = ${region}::"Region"
      GROUP BY 1
    `,
    // The archive's own monthly volume. Everything above is measured against
    // this: see the note on `momentum` below.
    db.$queryRaw<BaselineRow[]>`
      SELECT to_char(date_trunc('month', a."publishedAt"), 'YYYY-MM') AS "month",
             COUNT(*)::int AS "count"
      FROM "Article" a
      WHERE a."region" = ${region}::"Region"
        AND a."publishedAt" >= now() - (${WINDOW_MONTHS} || ' months')::interval
      GROUP BY 1
    `,
    db.$queryRaw<BaselineWindowRow[]>`
      SELECT COUNT(*) FILTER (
               WHERE a."publishedAt" >= now() - (${MOMENTUM_DAYS} || ' days')::interval
             )::int AS "recent",
             COUNT(*) FILTER (
               WHERE a."publishedAt" <  now() - (${MOMENTUM_DAYS} || ' days')::interval
                 AND a."publishedAt" >= now() - (${MOMENTUM_DAYS * 2} || ' days')::interval
             )::int AS "previous"
      FROM "Article" a
      WHERE a."region" = ${region}::"Region"
    `,
  ]);

  const axis = monthAxis(WINDOW_MONTHS);
  const byTag = new Map<string, Map<string, number>>();
  for (const row of months) {
    const series = byTag.get(row.tag) ?? new Map<string, number>();
    series.set(row.month, row.count);
    byTag.set(row.tag, series);
  }

  const catsByTag = new Map<string, { category: Category; count: number }[]>();
  for (const row of categories) {
    const list = catsByTag.get(row.tag) ?? [];
    list.push({ category: row.category, count: row.count });
    catsByTag.set(row.tag, list);
  }

  const windowByTag = new Map(windows.map((row) => [row.tag, row]));
  const baselineByMonth = new Map(baseline.map((row) => [row.month, row.count]));
  const archive = baselineWindows[0] ?? { recent: 0, previous: 0 };
  const archiveTotal = baseline.reduce((sum, row) => sum + row.count, 0);

  return TAG_META.map(({ key, label }) => {
    const series = byTag.get(key) ?? new Map<string, number>();
    // Zero-filled against a fixed axis: a sector with no coverage in March must
    // draw a gap at March, not close it up and imply continuous activity.
    const monthly = axis.map((month) => ({ month, count: series.get(month) ?? 0 }));
    const total = monthly.reduce((sum, point) => sum + point.count, 0);

    const window = windowByTag.get(key);
    const recent = window?.recent ?? 0;
    const previous = window?.previous ?? 0;

    // Share of all coverage, month by month. This is the series every rate on
    // the desk is computed from, and the reason is collection, not statistics:
    // the archive was backfilled and then kept live, so its raw monthly volume
    // rises steeply on its own. Measured in absolute counts, every sector on
    // the board "accelerates" - the growth being read is the crawler's, not
    // the sector's. A share cancels that out entirely: it rises only when a
    // sector gains ground on everything else being published.
    const shares = monthly.map((point) => {
      const total = baselineByMonth.get(point.month) ?? 0;
      return { month: point.month, count: total > 0 ? point.count / total : 0 };
    });

    const recentShare = archive.recent > 0 ? recent / archive.recent : 0;
    const priorShare = archive.previous > 0 ? previous / archive.previous : 0;

    const cats = (catsByTag.get(key) ?? []).sort((a, b) => b.count - a.count);
    const share = (wanted: Category[]) =>
      total === 0
        ? 0
        : cats
            .filter((entry) => wanted.includes(entry.category))
            .reduce((sum, entry) => sum + entry.count, 0) / total;

    return {
      key,
      label,
      total,
      monthly,
      monthlyShare: shares,
      recent,
      previous,
      momentum:
        previous >= MIN_MOMENTUM_BASE && priorShare > 0 ? recentShare / priorShare - 1 : null,
      yoy: yearOnYear(shares),
      cagr: compoundGrowth(shares),
      share: archiveTotal > 0 ? total / archiveTotal : 0,
      byCategory: cats,
      policyShare: share([Category.POLICY_REGULATORY, Category.SUBSIDY_SCHEME]),
      capitalShare: share([Category.INVESTMENT_FDI]),
      latestAt: window?.latest ? new Date(window.latest).getTime() : null,
    };
  });
}

export const getSectorSignals = unstable_cache(computeSignals, ["sector-signals"], {
  revalidate: 900,
});

/** `YYYY-MM` keys for the last `count` complete-ish months, oldest first. */
function monthAxis(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

/**
 * Last twelve months against the twelve before them.
 *
 * Year on year rather than month on month because policy news is violently
 * seasonal - a Budget lands in February and a sector's February is not
 * comparable to its January in any year.
 */
function yearOnYear(shares: MonthPoint[]): number | null {
  if (shares.length < 24) return null;
  const last = mean(shares.slice(-12));
  const prior = mean(shares.slice(-24, -12));
  return prior > 0 ? last / prior - 1 : null;
}

/** Mean share across a run of months - a share cannot be summed. */
function mean(points: MonthPoint[]): number {
  if (points.length === 0) return 0;
  return points.reduce((total, point) => total + point.count, 0) / points.length;
}

/**
 * Compound annual growth of coverage across the window.
 *
 * Computed on annual totals, not on end-point months: a single quiet December
 * would otherwise set the growth rate for two years. With a 24-month archive
 * this spans one year, so it and the year-on-year figure agree - it is written
 * as a rate rather than a ratio because that is the form a reader compares
 * against a market CAGR.
 */
function compoundGrowth(shares: MonthPoint[]): number | null {
  if (shares.length < 24) return null;
  const last = mean(shares.slice(-12));
  const first = mean(shares.slice(0, 12));
  if (first <= 0 || last <= 0) return null;
  const years = (shares.length - 12) / 12;
  return years > 0 ? Math.pow(last / first, 1 / years) - 1 : null;
}

export function sectorByKey(key: string): { key: string; label: string } | undefined {
  return TAG_META.find((tag) => tag.key === key);
}

/**
 * How interesting a sector looks, in one number, for ordering the table.
 *
 * Deliberately crude and deliberately transparent - it is a *sort order*, not a
 * rating, and the page says so. Momentum carries it because acceleration is the
 * thing a coverage archive can actually see; state support and visible capital
 * are the two multipliers that separate "a lot of noise" from "a lot of noise
 * with money and policy behind it". Volume enters only as a floor, so a sector
 * with four stories cannot top the table on a 300% swing.
 */
export function opportunityScore(signal: SectorSignal): number {
  if (signal.total < 20) return 0;
  const momentum = Math.max(-1, Math.min(signal.momentum ?? 0, 2));
  const scale = Math.log10(signal.total + 1);
  return (1 + momentum) * scale * (1 + signal.policyShare + signal.capitalShare * 2);
}

export type SectorDetail = {
  topSources: { name: string; count: number }[];
};

/** The per-sector extras, fetched only when a reader opens that sector. */
export const getSectorDetail = unstable_cache(
  async (key: string, region: Region): Promise<SectorDetail> => {
    const rows = await db.$queryRaw<{ name: string; count: number }[]>`
      SELECT s."name" AS "name", COUNT(*)::int AS "count"
      FROM "Article" a
      JOIN "Source" s ON s."id" = a."sourceId"
      WHERE a."region" = ${region}::"Region"
        AND ${key} = ANY(a."tags")
        AND a."publishedAt" >= now() - (${WINDOW_MONTHS} || ' months')::interval
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 8
    `;
    return { topSources: rows };
  },
  ["sector-detail"],
  { revalidate: 900 }
);

export type QuarterChange = { label: string; value: number | null; detail: string };

/**
 * Quarter-on-quarter change in coverage, most recent last.
 *
 * Built from the monthly series rather than queried again: the months are
 * already fetched, and folding three of them together is what turns a noisy
 * line into a readable direction. A quarter with no prior quarter to compare
 * against yields null rather than a fabricated zero.
 */
export function quarterlyChange(
  monthly: MonthPoint[],
  shares: MonthPoint[],
  quarters = 6
): QuarterChange[] {
  const buckets: { label: string; stories: number; share: number }[] = [];

  for (let end = monthly.length; end - 3 >= 0; end -= 3) {
    const months = monthly.slice(end - 3, end);
    const shareMonths = shares.slice(end - 3, end);
    const [year, month] = months[2].month.split("-");
    const quarter = Math.floor((Number(month) - 1) / 3) + 1;
    buckets.unshift({
      label: `Q${quarter} ${year.slice(2)}`,
      stories: months.reduce((sum, point) => sum + point.count, 0),
      // A share, so the bars show the sector gaining or losing ground rather
      // than the archive filling up.
      share: shareMonths.reduce((sum, point) => sum + point.count, 0) / 3,
    });
  }

  return buckets
    .map((bucket, i) => {
      const prior = buckets[i - 1];
      const ratable = prior && prior.share > 0 && bucket.stories + prior.stories >= MIN_MOMENTUM_BASE;
      return {
        label: bucket.label,
        value: ratable ? bucket.share / prior.share - 1 : null,
        detail: `${bucket.stories} stories, ${(bucket.share * 100).toFixed(1)}% of all coverage`,
      };
    })
    .slice(-quarters);
}
