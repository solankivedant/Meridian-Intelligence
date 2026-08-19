import { Category, Region } from "@/lib/enums";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { isPhoneRequest } from "@/lib/viewport";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { Section } from "@/components/Section";
import { ArticleRow } from "@/components/ArticleRow";
import { BriefPanel, BriefEntry } from "@/components/BriefPanel";
import { BriefSummaryPanel } from "@/components/BriefSummaryPanel";
import { CategoryPulse } from "@/components/CategoryPulse";
import { CoverageStrip } from "@/components/CoverageStrip";
import { LastUpdated } from "@/components/LastUpdated";
import { ArchiveSection } from "@/components/ArchiveSection";
import { OpportunityStrip } from "@/components/OpportunityStrip";
import { getLatestBrief, briefSummaryOf, BriefHighlights } from "@/lib/brief";
import { getCoverage } from "@/lib/coverage";
import { getSectorSignals } from "@/lib/opportunity";
import { getSectionBoard } from "@/lib/sectionBoard";
import { withLeadFirst } from "@/lib/leadStory";
import { timeAgo } from "@/lib/formatTime";
import { windowLabel } from "@/lib/timeRange";
import {
  FeedSearchParams,
  PAGE_SIZE,
  PHONE_PAGE_SIZE,
  parseFeedParams,
  buildFeedWhere,
  feedOrderBy,
  feedSlice,
  isNarrowed,
} from "@/lib/feedQuery";

export const revalidate = 0;

// Sized to land near the lead's own height - a much longer list leaves the
// column beside it empty.
const BRIEF_ITEMS = 5;

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
  searchParams: Promise<FeedSearchParams>;
}) {
  const parsed = parseFeedParams(
    await searchParams,
    (await isPhoneRequest()) ? PHONE_PAGE_SIZE : PAGE_SIZE
  );
  const where = buildFeedWhere(parsed, { region: Region.INDIA });
  // The pulse counts every section over the window the reader is browsing,
  // deliberately ignoring their section picks: a meter that vanished the
  // moment you filtered by it could never be used to switch to another.
  const pulseWhere = buildFeedWhere({ ...parsed, cats: [] }, { region: Region.INDIA });

  const [counts, articles, total, coverage, brief, sectors, board] = await Promise.all([
    safeQuery(
      () =>
        db.article.groupBy({
          by: ["category"],
          where: pulseWhere,
          _count: { _all: true },
        }),
      [] as { category: Category; _count: { _all: number } }[]
    ),
    safeQuery(
      () =>
        db.article.findMany({
          where,
          orderBy: feedOrderBy(parsed),
          include: { source: true },
          ...feedSlice(parsed),
        }),
      []
    ),
    safeQuery(() => db.article.count({ where }), 0),
    safeQuery(() => getCoverage(Region.INDIA), null),
    safeQuery(() => getLatestBrief(), null),
    safeQuery(() => getSectorSignals(Region.INDIA), []),
    // Only "sort by section" renders the board, so only it pays for the fetch.
    parsed.sort === "section" ? getSectionBoard(parsed, { region: Region.INDIA }) : undefined,
  ]);

  const countByCategory = new Map(counts.map((c) => [c.category, c._count._all]));
  const highlights = (brief?.highlights ?? {}) as BriefHighlights;
  const briefSummary = briefSummaryOf(brief?.summary ?? null);

  // The wrap + lead + pulse panels are the front page's editorial layer, shown
  // under the feed. Once a reader has filtered or paged they're browsing the
  // archive, so those panels drop away and the feed stands alone.
  const showFrontPage = parsed.page === 1 && !isNarrowed(parsed);
  const { lead, rest } = showFrontPage
    ? withLeadFirst(articles)
    : { lead: undefined, rest: articles };
  const briefEntries = interleaveHighlights(highlights, BRIEF_ITEMS, lead?.id);

  // The three sectors accelerating hardest, with enough coverage behind them
  // that the percentage means something.
  const movers = sectors
    .filter((signal) => signal.total >= 40 && signal.momentum !== null)
    .sort((a, b) => (b.momentum ?? 0) - (a.momentum ?? 0))
    .slice(0, 3);

  // Section markers are numbered at render time, in render order, because the
  // wrap and the lead both drop out on filtered views.
  let section = 0;
  const next = () => String(++section).padStart(2, "0");

  return (
    <div className="flex flex-col gap-8 pt-6">
      {/* Above everything, including the coverage strip: whether the page is
          current governs how the reader should read the rest of it. */}
      <div className="flex flex-col gap-3">
        <LastUpdated at={coverage?.updatedAt ?? null} />
        {coverage && <CoverageStrip coverage={coverage} desk="India desk" />}
      </div>

      {/* The feed opens the page. A reader arriving mid-morning wants to know
          what has landed since they last looked, and making them scroll past
          three editorial panels to reach it put the day's record last. The
          wrap, the lead and the pulse follow, and the masthead's jump links
          reach them in one click. */}
      <ArchiveSection
        index={next()}
        basePath="/"
        parsed={parsed}
        articles={rest}
        total={total}
        counts={countByCategory}
        board={board}
      />

      {showFrontPage && briefSummary && (
        <Section
          id="wrap"
          index={next()}
          title="The wrap"
          description="A read of the last 24 hours across every section."
        >
          <BriefSummaryPanel summary={briefSummary} />
        </Section>
      )}

      {lead && (
        <Section
          id="lead"
          index={next()}
          title="The lead"
          note={timeAgo(lead.publishedAt)}
          description="Today's most substantial story, and the day's brief across every section."
        >
          <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ArticleRow article={lead} variant="lead" />
            </div>

            {briefEntries.length > 0 && (
              <div
                className="flex flex-col lg:col-span-5 lg:border-l lg:pl-12"
                style={{ borderColor: "var(--rule)" }}
              >
                <p
                  className="kicker mb-3 border-b pb-2 text-[var(--text-primary)]"
                  style={{ borderColor: "var(--rule)" }}
                >
                  In brief
                  {brief && (
                    <span className="ml-2 font-normal normal-case tracking-normal text-[var(--text-muted)]">
                      generated {timeAgo(brief.generatedAt)}
                    </span>
                  )}
                </p>
                <BriefPanel entries={briefEntries} />
              </div>
            )}
          </div>
        </Section>
      )}

      {movers.length > 0 && (
        <Section
          id="sectors"
          index={next()}
          title="Where the money is going"
          note="last 90 days"
          accentVar="--cat-investment"
          description="The sectors this archive is getting loudest about, measured against the previous quarter."
        >
          <OpportunityStrip movers={movers} />
        </Section>
      )}

      <Section
        id="pulse"
        index={next()}
        title="The pulse"
        note={windowLabel(parsed.range, parsed.month)}
        description="How the window's volume splits across the eight sections - and the fastest way to narrow the feed to one of them."
      >
        <CategoryPulse counts={countByCategory} basePath="/" filters={parsed} />
      </Section>
    </div>
  );
}
