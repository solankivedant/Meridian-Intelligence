import { Category, Region } from "@prisma/client";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { Section } from "@/components/Section";
import { ArticleRow } from "@/components/ArticleRow";
import { BriefPanel, BriefEntry } from "@/components/BriefPanel";
import { BriefSummaryPanel } from "@/components/BriefSummaryPanel";
import { CategoryPulse } from "@/components/CategoryPulse";
import { CoverageStrip } from "@/components/CoverageStrip";
import { ArchiveSection } from "@/components/ArchiveSection";
import { getLatestBrief, briefSummaryOf, BriefHighlights } from "@/lib/brief";
import { getCoverage } from "@/lib/coverage";
import { withLeadFirst } from "@/lib/leadStory";
import { timeAgo } from "@/lib/formatTime";
import { hoursAgo } from "@/lib/timeRange";
import {
  PAGE_SIZE,
  FeedSearchParams,
  parseFeedParams,
  buildFeedWhere,
  isNarrowed,
} from "@/lib/feedQuery";

export const revalidate = 0;

// Sized to land near the lead's own height — a much longer list leaves the
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
  const parsed = parseFeedParams(await searchParams);
  const where = buildFeedWhere(parsed, { region: Region.INDIA });

  const [counts, articles, total, coverage, brief] = await Promise.all([
    safeQuery(
      () =>
        db.article.groupBy({
          by: ["category"],
          where: { region: Region.INDIA, publishedAt: { gte: hoursAgo(24) } },
          _count: { _all: true },
        }),
      [] as { category: Category; _count: { _all: number } }[]
    ),
    safeQuery(
      () =>
        db.article.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          include: { source: true },
          skip: (parsed.page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      []
    ),
    safeQuery(() => db.article.count({ where }), 0),
    safeQuery(() => getCoverage(Region.INDIA), null),
    safeQuery(() => getLatestBrief(), null),
  ]);

  const countByCategory = new Map(counts.map((c) => [c.category, c._count._all]));
  const highlights = (brief?.highlights ?? {}) as BriefHighlights;
  const briefSummary = briefSummaryOf(brief?.summary ?? null);

  // The wrap + lead + brief block is the front page. Once a reader has filtered
  // or paged they're browsing the archive, and want the feed instead.
  const showFrontPage = parsed.page === 1 && !isNarrowed(parsed);
  const { lead, rest } = showFrontPage
    ? withLeadFirst(articles)
    : { lead: undefined, rest: articles };
  const briefEntries = interleaveHighlights(highlights, BRIEF_ITEMS, lead?.id);

  // Section markers are numbered at render time because the wrap and the lead
  // both drop out on filtered views.
  let section = 0;
  const next = () => String(++section).padStart(2, "0");

  return (
    <div className="flex flex-col gap-8 pt-6">
      {coverage && <CoverageStrip coverage={coverage} desk="India desk" />}

      {showFrontPage && briefSummary && (
        <Section
          id="wrap"
          index={next()}
          title="The wrap"
          note={`written by ${briefSummary.model}`}
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

      <Section
        id="pulse"
        index={next()}
        title="The pulse"
        note="last 24 hours"
        description="How the day's volume splits across the eight sections."
      >
        <CategoryPulse counts={countByCategory} />
      </Section>

      <ArchiveSection
        index={next()}
        basePath="/"
        parsed={parsed}
        articles={rest}
        total={total}
      />
    </div>
  );
}
