import { Category, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { SectionHeading } from "@/components/SectionHeading";
import { ArticleRow } from "@/components/ArticleRow";
import { BriefPanel, BriefEntry } from "@/components/BriefPanel";
import { CategoryPulse } from "@/components/CategoryPulse";
import { DayFeed } from "@/components/DayFeed";
import { FeedFilterBar } from "@/components/FeedFilterBar";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { getLatestBrief, BriefHighlights } from "@/lib/brief";
import { withLeadFirst } from "@/lib/leadStory";
import { shortDate, timeAgo } from "@/lib/formatTime";
import {
  normalizeRange,
  rangeCutoff,
  isValidMonthKey,
  monthDateRange,
  hoursAgo,
} from "@/lib/timeRange";

export const revalidate = 0;

const PAGE_SIZE = 60;
const BRIEF_ITEMS = 8;

/**
 * Flattens the per-category brief into one ranked list by taking a turn from
 * each category before coming back round. Straight concatenation would fill
 * the panel with whichever category happened to be busiest that day.
 */
function interleaveHighlights(
  highlights: BriefHighlights,
  limit: number,
  excludeId?: string
): BriefEntry[] {
  const queues = CATEGORY_META.map((meta) => ({
    category: meta.category,
    items: (highlights[meta.category] ?? []).filter((i) => i.id !== excludeId),
  }));

  const entries: BriefEntry[] = [];
  for (let depth = 0; entries.length < limit; depth++) {
    let placedAny = false;
    for (const queue of queues) {
      const item = queue.items[depth];
      if (!item) continue;
      placedAny = true;
      entries.push({
        id: item.id,
        title: item.title,
        url: item.url,
        sourceName: item.sourceName,
        publishedAt: new Date(item.publishedAt),
        category: queue.category,
      });
      if (entries.length === limit) break;
    }
    if (!placedAny) break;
  }
  return entries;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; tag?: string; month?: string; page?: string }>;
}) {
  const params = await searchParams;
  const range = normalizeRange(params.range);
  const tag = params.tag ?? "";
  const month = isValidMonthKey(params.month) ? params.month : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const since24h = hoursAgo(24);
  const cutoff = rangeCutoff(range);

  // Browsing a specific month overrides the relative range entirely.
  const feedWhere: Prisma.ArticleWhereInput = {
    ...(month ? { publishedAt: monthDateRange(month) } : cutoff ? { publishedAt: { gte: cutoff } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [counts, articles, total, coverage, publisherCount, brief] = await Promise.all([
    safeQuery(
      () =>
        db.article.groupBy({
          by: ["category"],
          where: { publishedAt: { gte: since24h } },
          _count: { _all: true },
        }),
      [] as { category: Category; _count: { _all: number } }[]
    ),
    safeQuery(
      () =>
        db.article.findMany({
          where: feedWhere,
          orderBy: { publishedAt: "desc" },
          include: { source: true },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      []
    ),
    safeQuery(() => db.article.count({ where: feedWhere }), 0),
    safeQuery(
      () =>
        db.article.aggregate({
          _count: { _all: true },
          _min: { publishedAt: true },
          _max: { fetchedAt: true },
        }),
      null
    ),
    safeQuery(() => db.source.count(), 0),
    safeQuery(() => getLatestBrief(), null),
  ]);

  const countByCategory = new Map(counts.map((c) => [c.category, c._count._all]));
  const highlights = (brief?.highlights ?? {}) as BriefHighlights;

  // The lead + brief block is the front page. Once a reader has filtered or
  // paged, they're browsing the archive and want the feed, not the front page.
  const showFrontPage = page === 1 && !tag && !month;
  const { lead, rest } = showFrontPage
    ? withLeadFirst(articles)
    : { lead: undefined, rest: articles };
  const feedArticles = rest;
  const briefEntries = interleaveHighlights(highlights, BRIEF_ITEMS, lead?.id);

  return (
    <div className="flex flex-col gap-14 pt-8">
      {coverage && coverage._count._all > 0 && (
        <div
          className="-mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 border-b pb-3"
          style={{ borderColor: "var(--rule)" }}
        >
          <Stat value={coverage._count._all.toLocaleString("en-IN")} label="stories tracked" />
          <Stat value={String(publisherCount)} label="sources" />
          {coverage._min.publishedAt && (
            <Stat value={shortDate(coverage._min.publishedAt)} label="oldest story" />
          )}
          {coverage._max.fetchedAt && (
            <Stat value={timeAgo(coverage._max.fetchedAt)} label="last update" />
          )}
        </div>
      )}

      {lead && (
        <section className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionHeading title="The lead" note={timeAgo(lead.publishedAt)} />
            <ArticleRow article={lead} variant="lead" />
          </div>

          {briefEntries.length > 0 && (
            <div
              className="lg:col-span-5 lg:border-l lg:pl-12"
              style={{ borderColor: "var(--rule)" }}
            >
              <SectionHeading
                title="In brief"
                note={brief ? `generated ${timeAgo(brief.generatedAt)}` : undefined}
              />
              <BriefPanel entries={briefEntries} />
            </div>
          )}
        </section>
      )}

      <section>
        <SectionHeading title="The pulse" note="stories published in the last 24 hours" />
        <CategoryPulse counts={countByCategory} />
      </section>

      <section>
        <SectionHeading
          title={month || tag || range !== "7d" ? "Archive" : "Latest"}
          note={total > 0 ? `${total.toLocaleString("en-IN")} stories` : undefined}
        />
        <FeedFilterBar basePath="/" range={range} tag={tag} month={month} />

        {feedArticles.length === 0 ? (
          <EmptyState filtered={Boolean(tag || month) || range !== "7d"} />
        ) : (
          <>
            <DayFeed articles={feedArticles} />
            <Pagination
              basePath="/"
              params={{ range, tag, month }}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
            />
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[13px] font-medium tabular-nums text-[var(--text-primary)]">
        {value}
      </span>
      <span className="kicker text-[10px] text-[var(--text-muted)]">{label}</span>
    </span>
  );
}
