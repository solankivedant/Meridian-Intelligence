import { Category, Region } from "@/lib/enums";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { Section } from "@/components/Section";
import { ArticleRow } from "@/components/ArticleRow";
import { BriefPanel, BriefEntry } from "@/components/BriefPanel";
import { CategoryPulse } from "@/components/CategoryPulse";
import { CoverageStrip } from "@/components/CoverageStrip";
import { ArchiveSection } from "@/components/ArchiveSection";
import { getCoverage } from "@/lib/coverage";
import { withLeadFirst } from "@/lib/leadStory";
import { timeAgo } from "@/lib/formatTime";
import { windowLabel } from "@/lib/timeRange";
import {
  FeedSearchParams,
  parseFeedParams,
  buildFeedWhere,
  feedOrderBy,
  feedSlice,
  isNarrowed,
} from "@/lib/feedQuery";

export const revalidate = 0;

const ALONGSIDE_ITEMS = 5;

export const metadata = {
  title: "World desk",
  description:
    "Global policy, trade, technology, investment and macro stories tracked alongside the India desk.",
};

export default async function WorldPage({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}) {
  const parsed = parseFeedParams(await searchParams);
  const where = buildFeedWhere(parsed, { region: Region.WORLD });
  const pulseWhere = buildFeedWhere({ ...parsed, cats: [] }, { region: Region.WORLD });

  const [counts, articles, total, coverage] = await Promise.all([
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
    safeQuery(() => getCoverage(Region.WORLD), null),
  ]);

  const countByCategory = new Map(counts.map((c) => [c.category, c._count._all]));

  const showFrontPage = parsed.page === 1 && !isNarrowed(parsed);
  const { lead, rest } = showFrontPage
    ? withLeadFirst(articles)
    : { lead: undefined, rest: articles };

  // The world desk has no editor-written brief, so the column beside the lead
  // is drawn straight from the next few stories rather than left empty.
  const alongside: BriefEntry[] = rest.slice(0, ALONGSIDE_ITEMS).map((article) => ({
    id: article.id,
    title: article.title,
    url: article.url,
    sourceName: article.source.name,
    publishedAt: article.publishedAt,
    category: article.category,
  }));

  return (
    <div className="flex flex-col gap-8 pt-6">
      {coverage && <CoverageStrip coverage={coverage} desk="World desk" />}

      {/* The feed leads here for the same reason it does on the India desk:
          what has landed is the reason a reader opened the page. */}
      <ArchiveSection
        index="01"
        basePath="/world"
        parsed={parsed}
        articles={rest}
        total={total}
        counts={countByCategory}
      />

      {lead && (
        <Section
          id="lead"
          index="02"
          title="The lead"
          note={timeAgo(lead.publishedAt)}
          description="The strongest story on the world desk, with what else is moving beside it."
        >
          <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ArticleRow article={lead} variant="lead" />
            </div>
            {alongside.length > 0 && (
              <div
                className="flex flex-col lg:col-span-5 lg:border-l lg:pl-12"
                style={{ borderColor: "var(--rule)" }}
              >
                <p
                  className="kicker mb-3 border-b pb-2 text-[var(--text-primary)]"
                  style={{ borderColor: "var(--rule)" }}
                >
                  Also moving
                </p>
                <BriefPanel entries={alongside} />
              </div>
            )}
          </div>
        </Section>
      )}

      <Section
        id="pulse"
        index="03"
        title="The pulse"
        note={windowLabel(parsed.range, parsed.month)}
        description="How the world desk's volume splits across the eight sections - and the fastest way to narrow the feed to one of them."
      >
        <CategoryPulse counts={countByCategory} basePath="/world" filters={parsed} />
      </Section>

    </div>
  );
}
