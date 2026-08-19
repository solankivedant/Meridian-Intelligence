import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Category, Region } from "@/lib/enums";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { isPhoneRequest } from "@/lib/viewport";
import { Section } from "@/components/Section";
import { ArticleGrid } from "@/components/ArticleGrid";
import { ArchiveSection } from "@/components/ArchiveSection";
import { PersonaSectorCard } from "@/components/PersonaSectorCard";
import { SectionIcon } from "@/components/MetaIcon";
import { metaForCategory } from "@/lib/categoryMeta";
import { personaByKey } from "@/lib/personas";
import { getPersonaBriefing, personaScopeWhere } from "@/lib/personaDesk";
import { getSectionBoard } from "@/lib/sectionBoard";
import {
  FeedSearchParams,
  PAGE_SIZE,
  PHONE_PAGE_SIZE,
  parseFeedParams,
  buildFeedWhere,
  feedOrderBy,
  feedSlice,
} from "@/lib/feedQuery";

export const revalidate = 0;

/** Stories on the desk's own front page, before the archive under it. */
const TOP_STORIES = 9;
const TOP_STORIES_PHONE = 5;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ persona: string }>;
}): Promise<Metadata> {
  const persona = personaByKey((await params).persona);
  if (!persona) return { title: "Desk not found" };
  return { title: persona.title, description: persona.blurb };
}

/**
 * The archive read as one job rather than as eight sections.
 *
 * Everything here is a view over rows that already exist - no story is tagged
 * with a persona and nothing was re-ingested to build this. The desk is three
 * answers to the same question, in descending order of how much editing they
 * involve: what matters to this reader right now (selected and ranked), which
 * sectors they should be watching (measured, with the stories the measurements
 * came from), and then the whole archive scoped to them, with every filter and
 * sort the rest of the site has.
 */
export default async function PersonaDesk({
  params,
  searchParams,
}: {
  params: Promise<{ persona: string }>;
  searchParams: Promise<FeedSearchParams>;
}) {
  const persona = personaByKey((await params).persona);
  if (!persona) notFound();

  const phone = await isPhoneRequest();
  const parsed = parseFeedParams(
    await searchParams,
    phone ? PHONE_PAGE_SIZE : PAGE_SIZE
  );

  // The reader's own filters narrow *within* the desk rather than replacing it:
  // the persona scope and the filter clause are both present, so Prisma ANDs
  // them. Picking a section this desk does not follow legitimately returns
  // nothing, which is a truthful answer to what was asked.
  const where = {
    ...buildFeedWhere(parsed, { region: Region.INDIA }),
    ...personaScopeWhere(persona),
  };

  const [briefing, articles, total, counts, board] = await Promise.all([
    getPersonaBriefing(persona, Region.INDIA, phone ? TOP_STORIES_PHONE : TOP_STORIES),
    safeQuery(
      () =>
        db.article.findMany({
          where,
          orderBy: feedOrderBy(parsed),
          include: { source: true },
          // This desk's opening panel comes from its own ranked query, not
          // from the top of this feed, so nothing is lifted out of it.
          ...feedSlice(parsed, { liftsLead: false }),
        }),
      []
    ),
    safeQuery(() => db.article.count({ where }), 0),
    safeQuery(
      () =>
        db.article.groupBy({
          by: ["category"],
          where: {
            ...buildFeedWhere({ ...parsed, cats: [] }, { region: Region.INDIA }),
            ...personaScopeWhere(persona),
          },
          _count: { _all: true },
        }),
      [] as { category: Category; _count: { _all: number } }[]
    ),
    parsed.sort === "section"
      ? getSectionBoard(parsed, { region: Region.INDIA })
      : undefined,
  ]);

  const countByCategory = new Map(counts.map((c) => [c.category, c._count._all]));
  const Icon = persona.icon;
  const accent = `var(${persona.colorVar})`;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="border-b pb-6" style={{ borderColor: "var(--rule-strong)" }}>
        <Link
          href="/for"
          className="kicker inline-flex items-center gap-1.5 text-[10px] transition-opacity hover:opacity-70"
          style={{ color: accent }}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          Reader desks
        </Link>
        <h1 className="headline mt-2 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          {persona.title}
        </h1>
        <p className="measure mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {persona.blurb}
        </p>

        {/* What the desk is tuned to, stated rather than left to be inferred -
            a filtered view whose rule is invisible is one a reader cannot
            trust or correct. Each chip is also the way out to that section. */}
        <div
          className="mt-5 flex flex-wrap items-center gap-1.5 border-t pt-4"
          style={{ borderColor: "var(--rule)" }}
        >
          <span className="kicker mr-1 shrink-0 text-[10px] text-[var(--text-muted)]">
            Tuned to
          </span>
          {persona.categories.map((category) => {
            const meta = metaForCategory(category);
            return (
              <Link
                key={meta.slug}
                href={`/category/${meta.slug}`}
                className="flex items-center gap-1.5 border px-2 py-1 text-[11px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                style={{ borderColor: "var(--rule-strong)" }}
              >
                <SectionIcon meta={meta} size="xs" />
                {meta.shortLabel}
              </Link>
            );
          })}
          <span className="meta ml-1">
            + {persona.sectors.length} sectors
          </span>
        </div>
      </header>

      {briefing.top.length > 0 && (
        <Section
          id="lead"
          index="01"
          title="What matters for you"
          accentVar={persona.colorVar}
          note="last 14 days"
          description="Ranked by how directly each story bears on this desk, not merely by when it was filed - so a section this desk lives in outranks a passing mention of one of its sectors."
        >
          <ArticleGrid
            feature={briefing.top[0]}
            articles={briefing.top.slice(1)}
            startIndex={1}
          />
        </Section>
      )}

      <Section
        id="sectors"
        index="02"
        title="Your sectors"
        accentVar={persona.colorVar}
        note={`${persona.sectors.length} tracked`}
        description="What this archive measures about each sector this desk follows, and the latest stories those measurements were counted from. Open one for its full dashboard and market primer."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {briefing.sectors.map((read) => (
            <PersonaSectorCard key={read.meta.key} read={read} />
          ))}
        </div>
      </Section>

      <ArchiveSection
        index="03"
        basePath={`/for/${persona.key}`}
        parsed={parsed}
        articles={articles}
        total={total}
        counts={countByCategory}
        accentVar={persona.colorVar}
        board={board}
      />
    </div>
  );
}
