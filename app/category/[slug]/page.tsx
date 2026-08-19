import { notFound } from "next/navigation";
import Link from "next/link";
import { Region } from "@/lib/enums";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safeQuery";
import { isPhoneRequest } from "@/lib/viewport";
import { metaForSlug } from "@/lib/categoryMeta";
import { Section } from "@/components/Section";
import { ArticleRow } from "@/components/ArticleRow";
import { BriefPanel, BriefEntry } from "@/components/BriefPanel";
import { ArchiveSection } from "@/components/ArchiveSection";
import { SectionIcon } from "@/components/MetaIcon";
import { withLeadFirst } from "@/lib/leadStory";
import { timeAgo } from "@/lib/formatTime";
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

const ALONGSIDE_ITEMS = 5;

type CategoryParams = FeedSearchParams & { desk?: string };

function parseDesk(value: string | undefined): Region | undefined {
  if (value === "world") return Region.WORLD;
  if (value === "india") return Region.INDIA;
  return undefined;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CategoryParams>;
}) {
  const { slug } = await params;
  const meta = metaForSlug(slug);
  if (!meta) notFound();

  const search = await searchParams;
  const parsed = parseFeedParams(
    search,
    (await isPhoneRequest()) ? PHONE_PAGE_SIZE : PAGE_SIZE
  );
  // A section spans both desks; the reader can narrow it to one.
  const desk = parseDesk(search.desk);
  const where = buildFeedWhere(parsed, { category: meta.category, region: desk });

  const [articles, total] = await Promise.all([
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
  ]);

  // Only the first page of an unfiltered view gets a lead treatment - deeper
  // in the archive there is no "top story", just more of the record.
  const showLead = parsed.page === 1 && !isNarrowed(parsed);
  const { lead, rest } = showLead
    ? withLeadFirst(articles)
    : { lead: undefined, rest: articles };

  // The lead would otherwise sit alone across the panel with its deck capped
  // at a reading measure and the right third of the box empty; the next few
  // stories fill it, the same way the world desk's lead is framed.
  const alongside: BriefEntry[] = rest.slice(0, ALONGSIDE_ITEMS).map((article) => ({
    id: article.id,
    title: article.title,
    url: article.url,
    sourceName: article.source.name,
    publishedAt: article.publishedAt,
    category: article.category,
  }));

  const basePath = `/category/${meta.slug}`;
  const deskHref = (next: string) => {
    const qs = new URLSearchParams();
    if (next) qs.set("desk", next);
    return qs.toString() ? `${basePath}?${qs.toString()}` : basePath;
  };

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header
        className="border-t-4 pt-4"
        style={{ borderColor: `var(${meta.colorVar})` }}
      >
        <span
          className="kicker flex items-center gap-1.5"
          style={{ color: `var(${meta.colorVar})` }}
        >
          <SectionIcon meta={meta} size="sm" />
          Section
        </span>
        <h1 className="headline mt-1.5 text-[32px] leading-[1.06] text-[var(--text-primary)] sm:text-[46px]">
          {meta.label}
        </h1>
        <p className="measure mt-3 text-[15px] leading-[1.65] text-[var(--text-secondary)]">
          {meta.description}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
          <span className="kicker mr-1 text-[10px] text-[var(--text-muted)]">Desk</span>
          <DeskChip href={deskHref("")} active={!desk} color={`var(${meta.colorVar})`}>
            Both
          </DeskChip>
          <DeskChip href={deskHref("india")} active={desk === Region.INDIA} color={`var(${meta.colorVar})`}>
            India
          </DeskChip>
          <DeskChip href={deskHref("world")} active={desk === Region.WORLD} color={`var(${meta.colorVar})`}>
            World
          </DeskChip>
        </div>
      </header>

      {lead && (
        <Section
          id="lead"
          index="01"
          title="Leading this section"
          note={timeAgo(lead.publishedAt)}
          accentVar={meta.colorVar}
        >
          <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ArticleRow article={lead} variant="lead" showCategory={false} />
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
                  Also in this section
                </p>
                <BriefPanel entries={alongside} showCategory={false} />
              </div>
            )}
          </div>
        </Section>
      )}

      <ArchiveSection
        index={lead ? "02" : "01"}
        basePath={basePath}
        parsed={parsed}
        articles={rest}
        total={total}
        accentVar={meta.colorVar}
        showCategory={false}
        // The page is one section already; offering the section filter here
        // would only ever narrow it to itself or to nothing.
        showSections={false}
      />
    </div>
  );
}

function DeskChip({
  href,
  active,
  color,
  children,
}: {
  href: string;
  active: boolean;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className="border px-2.5 py-1 text-[12px] transition-colors"
      style={
        active
          ? {
              borderColor: color,
              backgroundColor: `color-mix(in srgb, ${color} 15%, var(--surface-1))`,
              color,
              fontWeight: 600,
            }
          : { borderColor: "var(--rule-strong)", color: "var(--text-secondary)" }
      }
    >
      {children}
    </Link>
  );
}
