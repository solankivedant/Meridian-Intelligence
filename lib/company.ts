import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { Category, Region } from "@/lib/enums";
import { COMPANIES, companyByKey, type Company } from "@/lib/entities";
import type { MonthPoint } from "@/lib/opportunity";

/**
 * What the archive can say about one named company.
 *
 * Structurally this is `lib/opportunity.ts` pointed at `entities` instead of
 * `tags`, and the two deliberately share their arithmetic and their caveats:
 * everything here counts *coverage*, momentum is measured as a share of all
 * coverage rather than as a raw count, and a company that has become loud has
 * not thereby become a good company. The reason the modules are separate
 * rather than generic over a column is that they answer different questions
 * and will diverge - a sector wants state support and capital shares, a
 * company wants who is writing about it and which of its group siblings are
 * in the news beside it.
 *
 * The share-of-coverage basis matters even more here than it does for
 * sectors. This archive was backfilled month by month and is still filling,
 * so its own monthly volume climbs on its own; counted absolutely, every
 * company in the dictionary would look like it was accelerating.
 */

/** The window every company signal is computed over. Matches the sector desk. */
export const WINDOW_MONTHS = 24;

/** Momentum compares the last quarter against the one before it. */
const MOMENTUM_DAYS = 90;

/**
 * A quarter needs at least this many stories behind it before a rate of change
 * means anything. Set lower than the sector desk's twelve on purpose: a single
 * company is a far narrower slice of the archive than a whole sector, and at
 * twelve almost nothing outside the Nifty 50 would ever be rated at all.
 */
const MIN_MOMENTUM_BASE = 6;

export type CompanySignal = {
  company: Company;
  /** Stories naming this company inside the window. */
  total: number;
  /** Oldest month first, gaps filled with zero so the series is continuous. */
  monthly: MonthPoint[];
  /** Stories in the last 90 days. */
  recent: number;
  /** Stories in the 90 days before those. */
  previous: number;
  /** Change in share of all coverage. Null when the prior quarter is too thin. */
  momentum: number | null;
  /** This company's share of all coverage in the window. */
  share: number;
  byCategory: { category: Category; count: number }[];
  /** Most recent story date, epoch ms. */
  latestAt: number | null;
};

type MonthRow = { entity: string; month: string; count: number };
type CategoryRow = { entity: string; category: Category; count: number };
type WindowRow = { entity: string; recent: number; previous: number; latest: Date | null };
type BaselineRow = { month: string; count: number };
type BaselineWindowRow = { recent: number; previous: number };

/**
 * One pass over the archive for every company in the dictionary.
 *
 * Three hundred per-company queries for a directory page is not a thing worth
 * doing, so each shape of the data is fetched once with `entities` unnested -
 * a story naming three companies counts once towards each - and the rollup
 * happens in memory. Cached for the same reasons the sector desk is: it scans
 * the whole window, it is identical for every reader, and it can only change
 * when ingestion runs.
 */
async function computeCompanySignals(region: Region): Promise<CompanySignal[]> {
  const [months, categories, windows, baseline, baselineWindows] = await Promise.all([
    db.$queryRaw<MonthRow[]>`
      SELECT e.entity AS "entity",
             to_char(date_trunc('month', a."publishedAt"), 'YYYY-MM') AS "month",
             COUNT(*)::int AS "count"
      FROM "Article" a
      CROSS JOIN LATERAL unnest(a."entities") AS e(entity)
      WHERE a."region" = ${region}::"Region"
        AND a."publishedAt" >= now() - (${WINDOW_MONTHS} || ' months')::interval
      GROUP BY 1, 2
    `,
    db.$queryRaw<CategoryRow[]>`
      SELECT e.entity AS "entity", a."category" AS "category", COUNT(*)::int AS "count"
      FROM "Article" a
      CROSS JOIN LATERAL unnest(a."entities") AS e(entity)
      WHERE a."region" = ${region}::"Region"
        AND a."publishedAt" >= now() - (${WINDOW_MONTHS} || ' months')::interval
      GROUP BY 1, 2
    `,
    db.$queryRaw<WindowRow[]>`
      SELECT e.entity AS "entity",
             COUNT(*) FILTER (
               WHERE a."publishedAt" >= now() - (${MOMENTUM_DAYS} || ' days')::interval
             )::int AS "recent",
             COUNT(*) FILTER (
               WHERE a."publishedAt" <  now() - (${MOMENTUM_DAYS} || ' days')::interval
                 AND a."publishedAt" >= now() - (${MOMENTUM_DAYS * 2} || ' days')::interval
             )::int AS "previous",
             MAX(a."publishedAt") AS "latest"
      FROM "Article" a
      CROSS JOIN LATERAL unnest(a."entities") AS e(entity)
      WHERE a."region" = ${region}::"Region"
      GROUP BY 1
    `,
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

  const byEntity = new Map<string, Map<string, number>>();
  for (const row of months) {
    const series = byEntity.get(row.entity) ?? new Map<string, number>();
    series.set(row.month, row.count);
    byEntity.set(row.entity, series);
  }

  const catsByEntity = new Map<string, { category: Category; count: number }[]>();
  for (const row of categories) {
    const list = catsByEntity.get(row.entity) ?? [];
    list.push({ category: row.category, count: row.count });
    catsByEntity.set(row.entity, list);
  }

  const windowByEntity = new Map(windows.map((row) => [row.entity, row]));
  const archive = baselineWindows[0] ?? { recent: 0, previous: 0 };
  const archiveTotal = baseline.reduce((sum, row) => sum + row.count, 0);

  return COMPANIES.map((company) => {
    const series = byEntity.get(company.key) ?? new Map<string, number>();
    const monthly = axis.map((month) => ({ month, count: series.get(month) ?? 0 }));
    const total = monthly.reduce((sum, point) => sum + point.count, 0);

    const window = windowByEntity.get(company.key);
    const recent = window?.recent ?? 0;
    const previous = window?.previous ?? 0;
    const recentShare = archive.recent > 0 ? recent / archive.recent : 0;
    const priorShare = archive.previous > 0 ? previous / archive.previous : 0;

    return {
      company,
      total,
      monthly,
      recent,
      previous,
      momentum:
        previous >= MIN_MOMENTUM_BASE && priorShare > 0 ? recentShare / priorShare - 1 : null,
      share: archiveTotal > 0 ? total / archiveTotal : 0,
      byCategory: (catsByEntity.get(company.key) ?? []).sort((a, b) => b.count - a.count),
      latestAt: window?.latest ? new Date(window.latest).getTime() : null,
    };
  });
}

export const getCompanySignals = unstable_cache(computeCompanySignals, ["company-signals"], {
  revalidate: 900,
});

export type CompanyDetail = {
  topSources: { name: string; count: number }[];
  /** Companies most often named in the same story - who this one moves with. */
  alongside: { key: string; name: string; count: number }[];
};

/**
 * The per-company extras, fetched only when a reader opens that company.
 *
 * `alongside` is the one figure here that a sector page has no equivalent of,
 * and it is the most useful thing on the page: co-occurrence in a headline is
 * how a reader discovers that a story about one bank is really a story about
 * the regulator's whole circular, or that two names are always in the same
 * deal. It is counted, not asserted - the pair simply appeared together.
 */
export const getCompanyDetail = unstable_cache(
  async (key: string, region: Region): Promise<CompanyDetail> => {
    const [sources, pairs] = await Promise.all([
      db.$queryRaw<{ name: string; count: number }[]>`
        SELECT s."name" AS "name", COUNT(*)::int AS "count"
        FROM "Article" a
        JOIN "Source" s ON s."id" = a."sourceId"
        WHERE a."region" = ${region}::"Region"
          AND ${key} = ANY(a."entities")
          AND a."publishedAt" >= now() - (${WINDOW_MONTHS} || ' months')::interval
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 8
      `,
      db.$queryRaw<{ entity: string; count: number }[]>`
        SELECT e.entity AS "entity", COUNT(*)::int AS "count"
        FROM "Article" a
        CROSS JOIN LATERAL unnest(a."entities") AS e(entity)
        WHERE a."region" = ${region}::"Region"
          AND ${key} = ANY(a."entities")
          AND e.entity <> ${key}
          AND a."publishedAt" >= now() - (${WINDOW_MONTHS} || ' months')::interval
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 8
      `,
    ]);

    return {
      topSources: sources,
      alongside: pairs.flatMap((row) => {
        const company = companyByKey(row.entity);
        // A key stored before its entry was removed from the dictionary has no
        // page to link to, so it is dropped rather than shown as a dead name.
        return company ? [{ key: row.entity, name: company.name, count: row.count }] : [];
      }),
    };
  },
  ["company-detail"],
  { revalidate: 900 }
);

/** `YYYY-MM` keys for the last `count` months, oldest first. */
function monthAxis(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export type CompanySort = "coverage" | "momentum" | "recent" | "name" | "sector";

export const COMPANY_SORTS: { key: CompanySort; label: string; hint: string }[] = [
  { key: "coverage", label: "Coverage", hint: "Stories naming this company in the window" },
  { key: "momentum", label: "Momentum", hint: "Change in share of coverage, last 90 days vs the 90 before" },
  { key: "recent", label: "Last 90 days", hint: "Stories in the most recent quarter" },
  { key: "sector", label: "Sector", hint: "Grouped by the sector desk each company files under" },
  { key: "name", label: "A–Z", hint: "Alphabetical" },
];

export function isCompanySort(value: string | undefined): value is CompanySort {
  return COMPANY_SORTS.some((sort) => sort.key === value);
}

export function sortCompanies(signals: CompanySignal[], sort: CompanySort): CompanySignal[] {
  const sorted = signals.slice();
  switch (sort) {
    case "momentum":
      // Unrated companies sink rather than sorting as zero - "too little
      // coverage to say" is not the same as "flat".
      return sorted.sort((a, b) => (b.momentum ?? -Infinity) - (a.momentum ?? -Infinity));
    case "recent":
      return sorted.sort((a, b) => b.recent - a.recent || b.total - a.total);
    case "name":
      return sorted.sort((a, b) => a.company.name.localeCompare(b.company.name));
    case "sector":
      return sorted.sort(
        (a, b) =>
          a.company.sector.localeCompare(b.company.sector) || b.total - a.total
      );
    default:
      return sorted.sort((a, b) => b.total - a.total || a.company.name.localeCompare(b.company.name));
  }
}
